//ipc de auditoria

const { obtenerHistorialAuditoria } = require("./service");

function registerAuditoriaIpc(ipcMain) {
    ipcMain.on("obtener-historial", async (event) => {
        try {
            const rows = await obtenerHistorialAuditoria();
            event.reply("historial-data", rows);
        } catch (err) {
            console.error("Error obteniendo historial:", err);
            event.reply("historial-data", []);
        }
    });
}

module.exports = {
    registerAuditoriaIpc
};