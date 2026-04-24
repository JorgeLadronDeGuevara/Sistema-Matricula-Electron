// preload_preview.js
const { contextBridge, ipcRenderer } = require("electron");

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value ?? "";
    } else {
        console.error("[preview] no existe el elemento:", id);
    }
}

function formatoMoneda(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function validarComprobanteMinimo(comprobante) {
    if (!esObjeto(comprobante)) return false;
    if (!String(comprobante.numero_comprobante || "").trim()) return false;
    return true;
}

function mostrarErrorSimple(mensaje) {
    console.error("[preview]", mensaje);
    window.alert(mensaje);
}

function renderizarDetallePago(comprobante) {
    const tbody = document.getElementById("detallePagoBody");
    if (!tbody) {
        console.error("[preview] no existe el tbody detallePagoBody");
        return;
    }

    const filas = [
        { concepto: "Donación", monto: Number(comprobante?.monto_donacion || 0) },
        { concepto: "Informática", monto: Number(comprobante?.monto_informatica || 0) },
        { concepto: "Carnet", monto: Number(comprobante?.monto_carnet || 0) },
        { concepto: "Odontología", monto: Number(comprobante?.monto_odontologia || 0) },
        { concepto: "Seguro", monto: Number(comprobante?.monto_seguro || 0) }
    ].filter(item => item.monto > 0);

    if (filas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2">No hay detalle de pago disponible.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = `
        ${filas.map(item => `
            <tr>
                <td>${item.concepto}</td>
                <td>${formatoMoneda(item.monto)}</td>
            </tr>
        `).join("")}
        <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${formatoMoneda(comprobante?.monto_total)}</strong></td>
        </tr>
    `;
}

function formatearFechaSoloDia(fecha) {
    if (!fecha) return "";

    const texto = String(fecha).trim();
    const soloFecha = texto.split(" ")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
        const [anio, mes, dia] = soloFecha.split("-");
        return `${dia}/${mes}/${anio}`;
    }

    return texto;
}

function renderizarComprobante(comprobante) {
    if (!validarComprobanteMinimo(comprobante)) {
        mostrarErrorSimple("Los datos del comprobante no son válidos.");
        return;
    }

    setText("numero", comprobante?.numero_comprobante || "");
    setText("fecha", formatearFechaSoloDia(comprobante?.fecha));
    setText("usuario", comprobante?.usuario || "");
    setText("nombre", `${comprobante?.nombres || ""} ${comprobante?.apellidos || ""}`.trim());
    setText("cedula", comprobante?.cedula || "");
    setText("grado", comprobante?.grado || "");

    renderizarDetallePago(comprobante);
}

window.addEventListener("DOMContentLoaded", () => {
    const btnPrint = document.getElementById("btnPrint");
    const btnClose = document.getElementById("btnClose");
    const btnDownload = document.getElementById("btnDownload");

    ipcRenderer.on("preview-comprobante-data", (_event, comprobante) => {
        renderizarComprobante(comprobante);
    });

    ipcRenderer.send("preview-renderer-ready");

    if (btnPrint) {
        btnPrint.addEventListener("click", async () => {
            btnPrint.disabled = true;
            const textoOriginal = btnPrint.textContent;
            btnPrint.textContent = "Abriendo impresión...";

            try {
                const res = await ipcRenderer.invoke("imprimir-desde-vista-previa");

                const mensaje = String(res?.message || "").toLowerCase();
                const fueCancelado =
                    mensaje.includes("canceled") ||
                    mensaje.includes("cancelled") ||
                    mensaje.includes("cancelado");

                if (!res?.success && !fueCancelado) {
                    mostrarErrorSimple(res?.message || "No se pudo imprimir el comprobante.");
                }
            } catch (error) {
                console.error("[preview] error al imprimir:", error);
                mostrarErrorSimple("Ocurrió un error al imprimir.");
            } finally {
                btnPrint.disabled = false;
                btnPrint.textContent = textoOriginal;
            }
        });
    }

    if (btnDownload) {
        btnDownload.addEventListener("click", async () => {
            btnDownload.disabled = true;
            const textoOriginal = btnDownload.textContent;
            btnDownload.textContent = "Descargando...";

            try {
                const res = await ipcRenderer.invoke("descargar-comprobante-pdf");

                if (!res?.success && res?.message !== "Guardado cancelado.") {
                    mostrarErrorSimple(res?.message || "No se pudo descargar el comprobante.");
                }
            } catch (error) {
                console.error("[preview] error al descargar:", error);
                mostrarErrorSimple("Ocurrió un error al descargar.");
            } finally {
                btnDownload.disabled = false;
                btnDownload.textContent = textoOriginal;
            }
        });
    }

    if (btnClose) {
        btnClose.addEventListener("click", () => {
            ipcRenderer.send("cerrar-vista-previa");
        });
    }
});