// ipc de pagos

const {
    obtenerHistorialPagosPorMatricula,
    obtenerComprobantePorNumero
} = require("./service");

function registerPagosIpc(ipcMain, deps = {}) {
    const { abrirVistaPrevia, getMainWindow } = deps;

    ipcMain.on("obtener-historial-pagos", async (event, matriculaId) => {
        try {
            const id = Number(matriculaId);

            if (!Number.isInteger(id) || id <= 0) {
                event.reply("historial-pagos-data", []);
                return;
            }

            const rows = await obtenerHistorialPagosPorMatricula(id);
            event.reply("historial-pagos-data", rows);
        } catch (err) {
            console.error("Error obteniendo historial de pagos:", err);
            event.reply("historial-pagos-data", []);
        }
    });

    ipcMain.handle("abrir-comprobante-desde-historial", async (_event, numeroComprobante) => {
        try {
            if (typeof abrirVistaPrevia !== "function") {
                return {
                    success: false,
                    message: "La vista previa de comprobantes no está disponible."
                };
            }

            const numero = String(numeroComprobante || "").trim();
            if (!numero) {
                return {
                    success: false,
                    message: "Número de comprobante inválido."
                };
            }

            const comprobante = await obtenerComprobantePorNumero(numero);
            const mainWindow = typeof getMainWindow === "function" ? getMainWindow() : null;

            return await abrirVistaPrevia(comprobante, mainWindow);
        } catch (error) {
            console.error("Error abriendo comprobante desde historial:", error);
            return {
                success: false,
                message: error.message || "No se pudo abrir el comprobante."
            };
        }
    });
}

module.exports = {
    registerPagosIpc
};