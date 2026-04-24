const { dbRun } = require("../db/helpers");

function createAudit({ getUsuarioActual, obtenerFechaLocalSQL }) {

    async function registrarHistorial(accion, descripcion, usuarioForzado = null) {
        const fecha = obtenerFechaLocalSQL();

        try {
            const sesion = getUsuarioActual?.();

            const usuario = usuarioForzado
                ? String(usuarioForzado).trim()
                : typeof sesion === "string"
                    ? sesion
                    : sesion?.usuario || "desconocido";

            await dbRun(`
                INSERT INTO historial (usuario, accion, descripcion, fecha)
                VALUES (?, ?, ?, ?)
            `, [
                usuario || "desconocido",
                accion,
                descripcion,
                fecha
            ]);
        } catch (err) {
            console.error("Error guardando historial:", err);
        }
    }

    return {
        registrarHistorial
    };
}

module.exports = {
    createAudit
};