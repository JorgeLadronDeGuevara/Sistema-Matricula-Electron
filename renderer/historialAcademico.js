import { getEstudiantesGlobal } from "./state.js";
import { mostrarAlerta } from "./ui.js";

function getRefs() {
    return {
        modalHistorialAcademico: document.getElementById("modalHistorialAcademico"),
        cerrarHistorialAcademico: document.getElementById("cerrarHistorialAcademico"),
        cerrarHistorialAcademicoX: document.getElementById("cerrarHistorialAcademicoX"),
        infoAlumnoHistorial: document.getElementById("infoAlumnoHistorial"),
        tablaHistorialAcademico: document.getElementById("tablaHistorialAcademico")
    };
}

export function limpiarModalHistorialAcademico() {
    const { infoAlumnoHistorial, tablaHistorialAcademico } = getRefs();

    if (infoAlumnoHistorial) {
        infoAlumnoHistorial.innerHTML = `<span>No hay estudiante seleccionado.</span>`;
    }

    if (tablaHistorialAcademico) {
        tablaHistorialAcademico.innerHTML = `
            <tr>
                <td colspan="9" class="historial-vacio">No hay historial para mostrar.</td>
            </tr>
        `;
    }
}

export function renderInfoAlumnoHistorial(alumno) {
    const { infoAlumnoHistorial } = getRefs();
    if (!infoAlumnoHistorial) return;

    if (!alumno) {
        infoAlumnoHistorial.innerHTML = `<span>No hay estudiante seleccionado.</span>`;
        return;
    }

    infoAlumnoHistorial.innerHTML = `
        <div class="item-hermano-seleccionado" style="margin-top:6px; padding:6px 10px; border:1px solid #ccc; border-radius:6px;">
            ${alumno.nombres || ""} ${alumno.apellidos || ""} - ${alumno.cedula || ""}
        </div>
    `;
}

export function renderHistorialAcademico(data) {
    const { tablaHistorialAcademico } = getRefs();
    if (!tablaHistorialAcademico) return;

    if (!Array.isArray(data) || data.length === 0) {
        tablaHistorialAcademico.innerHTML = `
            <tr>
                <td colspan="9" class="historial-vacio">Este estudiante no tiene historial académico registrado.</td>
            </tr>
        `;
        return;
    }

    tablaHistorialAcademico.innerHTML = data.map(item => `
        <tr>
            <td>${item.periodo || "—"}</td>
            <td>${item.grado || "—"}</td>
            <td>${item.cti || "—"}</td>
            <td>${item.hermano || "—"}</td>
            <td>${item.descuento_hermano || "No"}</td>
            <td>$${Number(item.pagado || 0).toFixed(2)}</td>
            <td>$${Number(item.seguro || 0).toFixed(2)}</td>
            <td>${item.estado_pago || "—"}</td>
            <td>
                ${item.estado_matricula === "activo"
                    ? "Matriculado"
                    : item.estado_matricula || "—"}
            </td>
        </tr>
    `).join("");
}

export async function abrirHistorialAcademicoDesdeUI(alumnoId) {
    const { modalHistorialAcademico } = getRefs();

    try {
        if (!Number.isInteger(alumnoId) || alumnoId <= 0) {
            mostrarAlerta("No se pudo identificar el alumno.");
            return;
        }

        const alumno = getEstudiantesGlobal().find(
            e => Number(e.alumno_id) === Number(alumnoId)
        );

        limpiarModalHistorialAcademico();
        renderInfoAlumnoHistorial(alumno || null);

        const res = await window.api.obtenerHistorialAcademico(alumnoId);

        if (!res?.success) {
            mostrarAlerta(res?.message || "No se pudo obtener el historial académico.");
            return;
        }

        renderHistorialAcademico(res.data || []);

        if (modalHistorialAcademico) {
            modalHistorialAcademico.classList.add("activo");
        }
    } catch (error) {
        console.error("Error abriendo historial académico:", error);
        mostrarAlerta("Ocurrió un error al abrir el historial académico.");
    }
}

export function initHistorialAcademico() {
    const {
        modalHistorialAcademico,
        cerrarHistorialAcademico,
        cerrarHistorialAcademicoX
    } = getRefs();

    if (modalHistorialAcademico) {
        modalHistorialAcademico.classList.remove("activo");
    }

    const cerrarModal = () => {
        modalHistorialAcademico?.classList.remove("activo");
    };

    cerrarHistorialAcademico?.addEventListener("click", cerrarModal);
    cerrarHistorialAcademicoX?.addEventListener("click", cerrarModal);

    window.addEventListener("solicitar-historial-academico", async (event) => {
        const alumnoId = Number(event?.detail?.alumnoId);
        await abrirHistorialAcademicoDesdeUI(alumnoId);
    });
}