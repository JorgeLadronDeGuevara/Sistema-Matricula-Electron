const bcrypt = require("bcryptjs");
const { dbGet } = require("../db/helpers");

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
const DEMORA_ERROR_MS = 900;

const intentosPorUsuario = new Map();

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function obtenerEstadoIntentos(usuario) {
    const key = String(usuario || "").trim().toLowerCase();
    if (!key) return null;

    const actual = intentosPorUsuario.get(key);

    if (!actual) {
        return {
            key,
            intentos: 0,
            bloqueadoHasta: null
        };
    }

    if (actual.bloqueadoHasta && Date.now() >= actual.bloqueadoHasta) {
        intentosPorUsuario.delete(key);
        return {
            key,
            intentos: 0,
            bloqueadoHasta: null
        };
    }

    return {
        key,
        intentos: actual.intentos || 0,
        bloqueadoHasta: actual.bloqueadoHasta || null
    };
}

function registrarIntentoFallido(usuario) {
    const estado = obtenerEstadoIntentos(usuario);
    if (!estado?.key) return null;

    const nuevosIntentos = (estado.intentos || 0) + 1;
    let bloqueadoHasta = null;

    if (nuevosIntentos >= MAX_INTENTOS) {
        bloqueadoHasta = Date.now() + BLOQUEO_MS;
    }

    const nuevoEstado = {
        intentos: nuevosIntentos,
        bloqueadoHasta
    };

    intentosPorUsuario.set(estado.key, nuevoEstado);
    return nuevoEstado;
}

function limpiarIntentos(usuario) {
    const key = String(usuario || "").trim().toLowerCase();
    if (!key) return;
    intentosPorUsuario.delete(key);
}

function registerAuth(
    ipcMain,
    {
        setUsuarioActual,
        getSesionActual,
        clearUsuarioActual,
        createWindow,
        createLoginWindow,
        getMainWindow,
        getLoginWindow,
        registrarHistorial
    }
) {
    ipcMain.handle("login", async (_event, usuario, password) => {
        try {
            const usuarioNormalizado = String(usuario || "").trim();
            const passwordNormalizado = String(password || "");

            if (!usuarioNormalizado || !passwordNormalizado) {
                return {
                    success: false,
                    message: "Debe ingresar usuario y contraseña."
                };
            }

            const sesionActual = getSesionActual?.() || null;
            if (sesionActual?.usuario) {
                return {
                    success: true,
                    usuario: sesionActual.usuario,
                    sesion: sesionActual
                };
            }

            const estadoIntentos = obtenerEstadoIntentos(usuarioNormalizado);

            if (estadoIntentos?.bloqueadoHasta && Date.now() < estadoIntentos.bloqueadoHasta) {
                const segundosRestantes = Math.ceil(
                    (estadoIntentos.bloqueadoHasta - Date.now()) / 1000
                );

                await registrarHistorial?.(
                    "LOGIN_FALLIDO",
                    `Intento de acceso fallido para el usuario ${usuarioNormalizado}`,
                    usuarioNormalizado
                );

                return {
                    success: false,
                    locked: true,
                    message: `Demasiados intentos fallidos. Intente nuevamente en ${segundosRestantes} segundos.`
                };
            }

            const row = await dbGet(
                `SELECT id, usuario, password, rol, activo 
                FROM usuarios 
                WHERE usuario = ?`,
                [usuarioNormalizado]
            );

           if (!row || !row.password) {
                registrarIntentoFallido(usuarioNormalizado);
                await esperar(DEMORA_ERROR_MS);

                await registrarHistorial?.(
                    "LOGIN_FALLIDO",
                    `Intento de acceso fallido para el usuario ${usuarioNormalizado}`,
                    usuarioNormalizado
                );

                return {
                    success: false,
                    message: "Usuario o contraseña incorrectos."
                };
            }

            if (Number(row.activo) !== 1) {
                await esperar(DEMORA_ERROR_MS);

                await registrarHistorial?.(
                    "LOGIN_USUARIO_INACTIVO",
                    `Intento de acceso con usuario inactivo ${usuarioNormalizado}`,
                    usuarioNormalizado
                );

                return {
                    success: false,
                    message: "Este usuario está inactivo. Contacte al administrador."
                };
            }

            const passwordValido = await bcrypt.compare(passwordNormalizado, row.password);

            if (!passwordValido) {
                const nuevoEstado = registrarIntentoFallido(usuarioNormalizado);
                await esperar(DEMORA_ERROR_MS);

                await registrarHistorial?.(
                    "LOGIN_FALLIDO",
                    `Contraseña incorrecta para el usuario ${usuarioNormalizado}`,
                    usuarioNormalizado
                );

                if (nuevoEstado?.bloqueadoHasta) {
                    await registrarHistorial?.(
                        "LOGIN_BLOQUEADO",
                        `El usuario ${usuarioNormalizado} fue bloqueado temporalmente por múltiples intentos fallidos`,
                        usuarioNormalizado
                    );

                    return {
                        success: false,
                        locked: true,
                        message: "Demasiados intentos fallidos. El acceso fue bloqueado temporalmente por 5 minutos."
                    };
                }

                return {
                    success: false,
                    message: "Usuario o contraseña incorrectos."
                };
            }

            limpiarIntentos(usuarioNormalizado);

            setUsuarioActual(row.usuario, {
                userId: row.id,
                rol: row.rol
            });

            await registrarHistorial?.(
                "LOGIN",
                `Inició sesión el usuario ${row.usuario}`
            );

            const loginWin = getLoginWindow?.();
            if (loginWin && !loginWin.isDestroyed()) {
                loginWin.close();
            }

            const win = getMainWindow?.();
            if (win && !win.isDestroyed()) {
                win.focus();
                win.webContents.send("sesion-actualizada", getSesionActual?.() || null);
            } else {
                const nuevaVentana = createWindow?.();
                nuevaVentana?.webContents?.once("did-finish-load", () => {
                    nuevaVentana.webContents.send("sesion-actualizada", getSesionActual?.() || null);
                });
            }

            const sesionFinal = getSesionActual?.() || null;

            return {
                success: true,
                usuario: sesionFinal?.usuario || row.usuario,
                sesion: sesionFinal
            };
        } catch (err) {
            console.error("Error en login:", err);
            return {
                success: false,
                message: "Ocurrió un error al iniciar sesión."
            };
        }
    });

    ipcMain.handle("logout", async () => {
        try {
            const sesion = getSesionActual?.() || null;

            await registrarHistorial?.(
                "LOGOUT",
                `Cerró sesión el usuario ${sesion?.usuario || "desconocido"}`
            );

            clearUsuarioActual?.();

            const mainWin = getMainWindow?.();
            if (mainWin && !mainWin.isDestroyed()) {
                mainWin.close();
            }

            const loginWin = getLoginWindow?.();
            if (loginWin && !loginWin.isDestroyed()) {
                loginWin.focus();
            } else if (typeof createLoginWindow === "function") {
                createLoginWindow();
            }

            return { success: true };
        } catch (error) {
            console.error("Error cerrando sesión:", error);
            return {
                success: false,
                message: "No se pudo cerrar la sesión."
            };
        }
    });

    ipcMain.handle("get-session", async () => {
        const sesion = getSesionActual?.() || null;

        return {
            logged: Boolean(sesion?.usuario),
            sesion
        };
    });
}

module.exports = {
    registerAuth
};