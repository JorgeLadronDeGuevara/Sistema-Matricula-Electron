// service de auditoria

const { dbAll } = require("../../db/helpers");

async function obtenerHistorialAuditoria() {
    return await dbAll(`
        SELECT * FROM historial
        ORDER BY id DESC
    `, []);
}

module.exports = {
    obtenerHistorialAuditoria
};