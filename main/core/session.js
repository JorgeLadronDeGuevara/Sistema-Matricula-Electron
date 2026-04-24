const crypto = require("crypto");

let sesionActual = null;

function generarSessionId() {
    return crypto.randomUUID();
}

function setUsuarioActual(usuario, extras = {}) {
    const nombre = String(usuario || "").trim().toLowerCase();
    const userId = Number(extras.userId);
    const rolInput = String(extras.rol || "usuario").trim().toLowerCase();

    const rol = rolInput === "admin" ? "admin" : "usuario";
    if (!nombre) {
        sesionActual = null;
        return;
    }

    sesionActual = {
        sessionId: generarSessionId(),
        usuario: nombre,
        userId: Number.isInteger(userId) && userId > 0 ? userId : null,
        rol,
        loginAt: new Date().toISOString()
    };
}

function getUsuarioActual() {
    return sesionActual ? { ...sesionActual } : null;
}

function getSesionActual() {
    return sesionActual ? { ...sesionActual } : null;
}

function clearUsuarioActual() {
    sesionActual = null;
}

function haySesionActiva() {
    return Boolean(
        sesionActual &&
        typeof sesionActual.usuario === "string" &&
        sesionActual.usuario.trim()
    );
}

module.exports = {
    setUsuarioActual,
    getUsuarioActual,
    getSesionActual,
    clearUsuarioActual,
    haySesionActiva
};