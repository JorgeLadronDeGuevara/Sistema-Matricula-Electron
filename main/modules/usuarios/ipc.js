// ipc de usuarios

const { ipcMain } = require("electron");

const {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    cambiarPasswordUsuario
} = require("./service");

const {
    getUsuarioActual
} = require("../../core/session");

function validarAdmin() {
    const usuarioActual = getUsuarioActual?.();

    if (!usuarioActual) {
        return {
            ok: false,
            message: "Debe iniciar sesión para administrar usuarios."
        };
    }

    if (usuarioActual.rol !== "admin") {
        return {
            ok: false,
            message: "No tiene permisos para administrar usuarios."
        };
    }

    return {
        ok: true,
        usuarioActual
    };
}

function inicializarIPCUsuarios({ registrarHistorial } = {}) {
    ipcMain.handle("usuarios:listar", async () => {
        try {
            const permiso = validarAdmin();

            if (!permiso.ok) {
                return {
                    success: false,
                    message: permiso.message
                };
            }

            return {
                success: true,
                usuarios: await listarUsuarios()
            };
        } catch (error) {
            console.error("Error listando usuarios:", error);

            return {
                success: false,
                message: "No se pudieron cargar los usuarios."
            };
        }
    });

    ipcMain.handle("usuarios:crear", async (_event, datos) => {
        try {
            const permiso = validarAdmin();

            if (!permiso.ok) {
                return {
                    success: false,
                    message: permiso.message
                };
            }

            const nuevo = await crearUsuario(datos);

            await registrarHistorial?.(
                "CREAR_USUARIO",
                `Creó el usuario ${nuevo.usuario} con rol ${nuevo.rol}`
            );

            return {
                success: true,
                usuario: nuevo
            };
        } catch (error) {
            console.error("Error creando usuario:", error);

            return {
                success: false,
                message: error.message || "No se pudo crear el usuario."
            };
        }
    });

    ipcMain.handle("usuarios:actualizar", async (_event, id, datos) => {
        try {

            if (!Number.isInteger(Number(id))) {
                return {
                    success: false,
                    message: "ID inválido."
                };
            }

            const permiso = validarAdmin();

            if (!permiso.ok) {
                return {
                    success: false,
                    message: permiso.message
                };
            }

            const actualizado = await actualizarUsuario(
                Number(id),
                datos,
                permiso.usuarioActual.userId
            );

            await registrarHistorial?.(
                "ACTUALIZAR_USUARIO",
                `Actualizó el usuario ${actualizado.usuario}`
            );

            return {
                success: true,
                usuario: actualizado
            };
        } catch (error) {
            console.error("Error actualizando usuario:", error);

            return {
                success: false,
                message: error.message || "No se pudo actualizar el usuario."
            };
        }
    });

    ipcMain.handle("usuarios:cambiar-password", async (_event, id, nuevaPassword) => {
        try {

             if (!Number.isInteger(Number(id))) {
                return {
                    success: false,
                    message: "ID inválido."
                };
            }

            const permiso = validarAdmin();

            if (!permiso.ok) {
                return {
                    success: false,
                    message: permiso.message
                };
            }

            await cambiarPasswordUsuario(Number(id), nuevaPassword);

            await registrarHistorial?.(
                "CAMBIAR_PASSWORD_USUARIO",
                `Cambió la contraseña del usuario con ID ${id}`
            );

            return {
                success: true
            };
        } catch (error) {
            console.error("Error cambiando contraseña de usuario:", error);

            return {
                success: false,
                message: error.message || "No se pudo cambiar la contraseña."
            };
        }
    });
}

module.exports = {
    inicializarIPCUsuarios
};