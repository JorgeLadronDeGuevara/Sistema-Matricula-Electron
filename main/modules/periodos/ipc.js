// ipc de periodos

const {
    obtenerPeriodoActivoId,
    obtenerPeriodoPorId,
    activarPeriodo,
    obtenerTodosLosPeriodos,
    crearPeriodoAcademico
} = require("./service");

function registerPeriodosIpc(ipcMain, deps = {}) {
    const {
        registrarHistorial,
        obtenerFechaLocalSQL
    } = deps;

    ipcMain.handle("obtener-periodos", async () => {
        try {
            return await obtenerTodosLosPeriodos();
        } catch (err) {
            console.error("Error obteniendo períodos:", err);
            return [];
        }
    });

    ipcMain.handle("obtener-periodo-activo", async () => {
        try {
            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) return null;

            return await obtenerPeriodoPorId(periodoId);
        } catch (error) {
            console.error("Error en obtener-periodo-activo:", error);
            return null;
        }
    });

    ipcMain.handle("crear-periodo-academico", async (_event, data) => {
        try {
            const res = await crearPeriodoAcademico(data, obtenerFechaLocalSQL);

            if (res?.success) {
                await registrarHistorial?.("CREAR_PERIODO", `Creó el período académico ${res.periodo.nombre}`);
            }

            return res;
        } catch (error) {
            console.error("Error creando período académico:", error);
            return { success: false, message: "No se pudo crear el período." };
        }
    });

    ipcMain.handle("cambiar-periodo-activo", async (_event, periodoId) => {
        try {
            if (!Number.isInteger(periodoId)) {
                return { success: false, message: "ID de período inválido." };
            }

            const periodo = await obtenerPeriodoPorId(periodoId);

            if (!periodo) {
                return { success: false, message: "El período no existe." };
            }

            await activarPeriodo(periodoId);

            await registrarHistorial?.("CAMBIAR_PERIODO", `Cambió el período activo a ${periodo.nombre}`);

            return {
                success: true,
                periodo: {
                    ...periodo,
                    estado: "activo"
                }
            };
        } catch (error) {
            console.error("Error cambiando período activo:", error);
            return { success: false, message: "No se pudo cambiar el período activo." };
        }
    });
}

module.exports = {
    registerPeriodosIpc
};