// service de comprobantes

const fs = require("fs");
const path = require("path");
const { crearVentanaPreview, getPreviewWindow } = require("./window");

function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function sanitizarNombreArchivo(nombre) {
    return String(nombre || "comprobante")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim()
        .slice(0, 100) || "comprobante";
}

function validarComprobante(comprobante) {
    if (!esObjeto(comprobante)) {
        throw new Error("Comprobante inválido.");
    }

    const numero = String(comprobante.numero_comprobante || "").trim();
    const nombres = String(comprobante.nombres || "").trim();
    const apellidos = String(comprobante.apellidos || "").trim();

    if (!numero) {
        throw new Error("El comprobante no tiene número.");
    }

    if (!nombres && !apellidos) {
        throw new Error("El comprobante no tiene datos suficientes del estudiante.");
    }

    return true;
}

async function abrirVistaPrevia(comprobante, parentWindow = null) {
    validarComprobante(comprobante);

    const win = crearVentanaPreview(parentWindow);
    win.__comprobanteData = comprobante;

    if (win.webContents.isLoading()) {
        win.webContents.once("did-finish-load", () => {
            if (!win.isDestroyed()) {
                win.webContents.send("preview-comprobante-data", comprobante);
                win.show();
                win.focus();
            }
        });
    } else {
        win.webContents.send("preview-comprobante-data", comprobante);
        win.show();
        win.focus();
    }

    return { success: true };
}

async function imprimirDesdePreview(senderWebContents) {
    const targetWindow = senderWebContents?.getOwnerBrowserWindow?.() || getPreviewWindow();

    if (!targetWindow || targetWindow.isDestroyed()) {
        throw new Error("No se encontró la ventana de vista previa.");
    }

    const tituloOriginal = targetWindow.getTitle();
    targetWindow.setTitle("Sistema de Matrícula - Impresión");

    try {
        const resultado = await new Promise((resolve, reject) => {
            targetWindow.webContents.print(
                {
                    silent: false,
                    printBackground: true,
                    margins: {
                        marginType: "default"
                    }
                },
                (success, failureReason) => {
                    const motivo = String(failureReason || "").toLowerCase();
                    const fueCancelado =
                        motivo.includes("cancel") ||
                        motivo.includes("canceled") ||
                        motivo.includes("cancelled");

                    if (!success && !fueCancelado) {
                        reject(new Error(failureReason || "No se pudo imprimir."));
                        return;
                    }

                    resolve({
                        printed: success,
                        canceled: !success && fueCancelado
                    });
                }
            );
        });

        return {
            success: true,
            printed: Boolean(resultado?.printed),
            canceled: Boolean(resultado?.canceled)
        };
    } finally {
        if (!targetWindow.isDestroyed()) {
            targetWindow.setTitle(tituloOriginal);
        }
    }
}

async function descargarPDFDesdePreview(senderWebContents, dialog) {
    const targetWindow = senderWebContents?.getOwnerBrowserWindow?.() || getPreviewWindow();

    if (!targetWindow || targetWindow.isDestroyed()) {
        throw new Error("No se encontró la ventana de vista previa.");
    }

    const comprobante = targetWindow.__comprobanteData;
    validarComprobante(comprobante);

    const pdfBuffer = await targetWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    });

    const nombreBase = sanitizarNombreArchivo(comprobante.numero_comprobante || "comprobante");

    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Guardar comprobante PDF",
        defaultPath: `${nombreBase}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
    });

    if (canceled || !filePath) {
        return { success: false, message: "Guardado cancelado." };
    }

    const rutaFinal = filePath.toLowerCase().endsWith(".pdf")
        ? filePath
        : `${filePath}.pdf`;

    fs.writeFileSync(rutaFinal, pdfBuffer);

    return { success: true, filePath: rutaFinal };
}

function enviarDataPreviewRendererReady(senderWebContents) {
    const targetWindow = senderWebContents?.getOwnerBrowserWindow?.() || getPreviewWindow();

    if (!targetWindow || targetWindow.isDestroyed()) {
        return;
    }

    const comprobante = targetWindow.__comprobanteData;

    if (comprobante) {
        senderWebContents.send("preview-comprobante-data", comprobante);
    }
}

module.exports = {
    abrirVistaPrevia,
    imprimirDesdePreview,
    descargarPDFDesdePreview,
    enviarDataPreviewRendererReady
};