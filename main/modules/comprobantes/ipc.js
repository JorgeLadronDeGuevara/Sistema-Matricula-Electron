// ipc de comprobantes

const {
    abrirVistaPrevia,
    imprimirDesdePreview,
    descargarPDFDesdePreview,
    enviarDataPreviewRendererReady
} = require("./service");

const { cerrarPreview } = require("./window");

function registerComprobantesIpc(ipcMain, deps = {}) {
    const { dialog, getMainWindow } = deps;

    ipcMain.handle("abrir-vista-previa-comprobante", async (_event, comprobante) => {
        try {
            const parentWindow = typeof getMainWindow === "function" ? getMainWindow() : null;
            return await abrirVistaPrevia(comprobante, parentWindow);
        } catch (error) {
            console.error("Error abriendo vista previa:", error);
            return {
                success: false,
                message: error.message || "No se pudo abrir la vista previa."
            };
        }
    });

    ipcMain.handle("imprimir-desde-vista-previa", async (event) => {
        try {
            return await imprimirDesdePreview(event.sender);
        } catch (error) {
            console.error("Error imprimiendo desde vista previa:", error);
            return {
                success: false,
                message: error.message || "Error al imprimir."
            };
        }
    });

    ipcMain.handle("descargar-comprobante-pdf", async (event) => {
        try {
            return await descargarPDFDesdePreview(event.sender, dialog);
        } catch (error) {
            console.error("Error descargando comprobante PDF:", error);
            return {
                success: false,
                message: error.message || "No se pudo descargar el comprobante."
            };
        }
    });

    ipcMain.on("cerrar-vista-previa", () => {
        cerrarPreview();
    });

    ipcMain.on("preview-renderer-ready", (event) => {
        enviarDataPreviewRendererReady(event.sender);
    });
}

module.exports = {
    registerComprobantesIpc
};