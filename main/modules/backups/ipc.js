// ipc de backup

const {
    crearRespaldoBaseDeDatos,
    restaurarRespaldoBaseDeDatos
} = require("./service");

function registerBackupsIpc(ipcMain, deps = {}) {
    const {
        app,
        dbPath,
        dialog,
        registrarHistorial,
        cerrarConexionBaseDeDatos,
        reabrirConexionBaseDeDatos
    } = deps;

    ipcMain.handle("crear-respaldo-db", async () => {
        try {
            if (!dbPath || !dialog) {
                return {
                    success: false,
                    message: "Dependencias incompletas para crear respaldo."
                };
            }

            return await crearRespaldoBaseDeDatos({
                dbPath,
                dialog,
                registrarHistorial
            });
        } catch (error) {
            console.error("Error creando respaldo:", error);
            return {
                success: false,
                message: error.message || "No se pudo crear el respaldo."
            };
        }
    });

    ipcMain.handle("restaurar-respaldo-db", async () => {
        try {
            if (
                !app ||
                !dbPath ||
                !dialog ||
                typeof cerrarConexionBaseDeDatos !== "function" ||
                typeof reabrirConexionBaseDeDatos !== "function"
            ) {
                return {
                    success: false,
                    message: "Dependencias incompletas para restaurar respaldo."
                };
            }

            return await restaurarRespaldoBaseDeDatos({
                app,
                dbPath,
                dialog,
                cerrarConexionBaseDeDatos,
                reabrirConexionBaseDeDatos,
                registrarHistorial
            });
        } catch (error) {
            console.error("Error en restauración:", error);
            return {
                success: false,
                message: error.message || "No se pudo restaurar el respaldo."
            };
        }
    });
}

module.exports = {
    registerBackupsIpc
};