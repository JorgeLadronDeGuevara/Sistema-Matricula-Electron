import { setModoEliminados } from "./state.js";

export function formatearNombrePeriodo(periodo) {
    if (!periodo) return "Sin período activo";
    return `${periodo.nombre || "Sin período activo"} (${periodo.estado === "activo" ? "Activo" : "Cerrado"})`;
}

export async function obtenerPeriodoActivoUI() {
    try {
        const periodoActivo = await window.api.obtenerPeriodoActivo();
        return periodoActivo || null;
    } catch (error) {
        console.error("Error obteniendo período activo:", error);
        return null;
    }
}

export async function obtenerNombrePeriodoActivo() {
    const periodoActivo = await obtenerPeriodoActivoUI();
    return periodoActivo?.nombre || "Sin período";
}

export async function cargarPeriodosEnUI() {
    try {
        const [periodos, periodoActivo] = await Promise.all([
            window.api.obtenerPeriodos(),
            window.api.obtenerPeriodoActivo()
        ]);

        const textoPeriodo = document.getElementById("periodoActivoTexto");
        const studentsPeriodoActivo = document.getElementById("studentsPeriodoActivo");
        const selectorPeriodo = document.getElementById("selectorPeriodo");
        const pagosPeriodoActivo = document.getElementById("pagosPeriodoActivo");

        if (textoPeriodo) {
            textoPeriodo.textContent = periodoActivo
                ? `${periodoActivo.nombre} (${periodoActivo.estado === "activo" ? "Activo" : "Cerrado"})`
                : "Sin período activo";
        }

        if (studentsPeriodoActivo) {
            studentsPeriodoActivo.textContent = periodoActivo
                ? periodoActivo.nombre
                : "Sin período activo";
        }

        if (pagosPeriodoActivo) {
            pagosPeriodoActivo.textContent = periodoActivo
                ? periodoActivo.nombre
                : "Sin período activo";
        }

        if (selectorPeriodo) {
            selectorPeriodo.innerHTML = "";

            if (!Array.isArray(periodos) || periodos.length === 0) {
                selectorPeriodo.innerHTML = `<option value="">Sin períodos</option>`;
                return;
            }

            periodos.forEach(periodo => {
                const option = document.createElement("option");
                option.value = periodo.id;
                option.textContent = periodo.nombre;

                if (periodoActivo && Number(periodo.id) === Number(periodoActivo.id)) {
                    option.selected = true;
                }

                selectorPeriodo.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error cargando períodos en UI:", error);

        const textoPeriodo = document.getElementById("periodoActivoTexto");
        const studentsPeriodoActivo = document.getElementById("studentsPeriodoActivo");
        const pagosPeriodoActivo = document.getElementById("pagosPeriodoActivo");

        if (textoPeriodo) {
            textoPeriodo.textContent = "Error cargando período";
        }

        if (studentsPeriodoActivo) {
            studentsPeriodoActivo.textContent = "Error";
        }

        if (pagosPeriodoActivo) {
            pagosPeriodoActivo.textContent = "Error";
        }
    }
}

export function limpiarFormularioPeriodo() {
    const nombrePeriodo = document.getElementById("nombrePeriodo");
    const fechaInicioPeriodo = document.getElementById("fechaInicioPeriodo");
    const fechaFinPeriodo = document.getElementById("fechaFinPeriodo");

    if (nombrePeriodo) nombrePeriodo.value = "";
    if (fechaInicioPeriodo) fechaInicioPeriodo.value = "";
    if (fechaFinPeriodo) fechaFinPeriodo.value = "";
}

export async function refrescarVistaPorPeriodo({
    onResetEstado = () => {}
} = {}) {
    setModoEliminados(false);
    onResetEstado();

    const btnRecuperar = document.getElementById("btnRecuperar");
    if (btnRecuperar) {
        btnRecuperar.innerHTML = '<i class="fas fa-undo"></i> Recuperar estudiantes';
        btnRecuperar.classList.remove("modo-eliminados");
    }

    await cargarPeriodosEnUI();
    window.api.traerEstudiantes();
}