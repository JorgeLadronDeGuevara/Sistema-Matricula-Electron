// tabla.js

import {
    getEstudiantesGlobal,
    getPaginaActual,
    setPaginaActual,
    getFilasPorPagina,
    getModoEliminados
} from "./state.js";

import {
    escapeHTML,
    formatoDinero,
    calcularEstado
} from "./utils.js";

import { editarEstudiante } from "./modal.js";

let eventosTablaInicializados = false;

window.api?.onEstudianteRecuperado(() => {
    if (getModoEliminados()) {
        window.api.traerEliminados();
    } else {
        window.api.traerEstudiantes();
    }
});

function obtenerDescuentoActual(est) {
    return est?.descuento_hermano ?? est?.descuentoHermano ?? "No";
}

function renderEstadoBadge(estado) {
    const clase =
        estado === "Cancelado" ? "badge-estado cancelado" :
        estado === "Abonado" ? "badge-estado abonado" :
        "badge-estado pendiente";

    return `<span class="${clase}">${escapeHTML(estado)}</span>`;
}

function renderSexoBadge(valor) {
    const sexo = String(valor || "").trim().toUpperCase();

    if (sexo === "M") {
        return `<span class="badge-sexo m">M</span>`;
    }

    if (sexo === "F") {
        return `<span class="badge-sexo f">F</span>`;
    }

    return `<span class="badge-no"></span>`;
}

function renderBooleanBadge(valor) {
    const texto = String(valor ?? "").trim().toLowerCase();

    if (!texto) {
        return `<span class="badge-vacio"></span>`;
    }

    const esSi = texto === "si" || texto === "sí";
    return `<span class="${esSi ? "badge-si" : "badge-no"}">${esSi ? "Sí" : "No"}</span>`;
}

function emitirSolicitudHistorialAcademico(alumnoId) {
    window.dispatchEvent(
        new CustomEvent("solicitar-historial-academico", {
            detail: { alumnoId }
        })
    );
}

function emitirSolicitudEliminarEstudiante(id) {
    window.dispatchEvent(
        new CustomEvent("solicitar-eliminar-estudiante", {
            detail: { id }
        })
    );
}

function actualizarResumenEstudiantes(mostrados, total) {
    const resumenTabla = document.getElementById("resumenEstudiantes");
    const resumenTop = document.getElementById("resumenEstudiantesTop");

    if (resumenTabla) {
        resumenTabla.textContent = `${mostrados} de ${total} estudiantes`;
    }

    if (resumenTop) {
        resumenTop.textContent = `Mostrando ${mostrados} estudiantes`;
    }
}

function renderEmptyState(tablaBody, mensaje = "No hay estudiantes registrados.", detalle = "Agrega un nuevo estudiante para comenzar.") {
    tablaBody.innerHTML = `
        <tr>
            <td colspan="13">
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>${escapeHTML(mensaje)}</p>
                    <small>${escapeHTML(detalle)}</small>
                </div>
            </td>
        </tr>
    `;
}

function inicializarEventosTabla() {
    if (eventosTablaInicializados) return;
    eventosTablaInicializados = true;

    const tablaBody = document.querySelector("#tablaEstudiantes tbody");
    if (!tablaBody) return;

    tablaBody.addEventListener("click", (event) => {
        const boton = event.target.closest("button");
        if (!boton) return;

        if (boton.classList.contains("recuperar-btn")) {
            const id = Number(boton.dataset.id);
            if (Number.isInteger(id) && id > 0) {
                window.api.recuperarEstudiante(id);
            }
            return;
        }

        if (boton.classList.contains("historial-btn")) {
            const alumnoId = Number(boton.dataset.alumnoId);
            if (Number.isInteger(alumnoId) && alumnoId > 0) {
                emitirSolicitudHistorialAcademico(alumnoId);
            }
            return;
        }

        if (boton.classList.contains("edit-btn")) {
            const id = Number(boton.dataset.id);
            if (Number.isInteger(id) && id > 0) {
                editarEstudiante(id);
            }
            return;
        }

        if (boton.classList.contains("delete-btn")) {
            const id = Number(boton.dataset.id);
            if (Number.isInteger(id) && id > 0) {
                emitirSolicitudEliminarEstudiante(id);
            }
        }
    });
}

export function renderizarPagina() {
    inicializarEventosTabla();

    const tablaBody = document.querySelector("#tablaEstudiantes tbody");
    if (!tablaBody) return;

    const estudiantes = getEstudiantesGlobal();
    const totalEstudiantes = estudiantes.length;
    const inicio = (getPaginaActual() - 1) * getFilasPorPagina();
    const fin = inicio + getFilasPorPagina();

    const estudiantesPagina = estudiantes.slice(inicio, fin);

    actualizarResumenEstudiantes(estudiantesPagina.length, totalEstudiantes);

    if (totalEstudiantes === 0) {
        renderEmptyState(
            tablaBody,
            "No hay estudiantes registrados.",
            "Agrega un nuevo estudiante para comenzar."
        );
        renderizarBotonesPaginacion();
        return;
    }

    if (estudiantesPagina.length === 0) {
        renderEmptyState(
            tablaBody,
            "No hay resultados en esta página.",
            "Prueba cambiando la paginación o la búsqueda."
        );
        renderizarBotonesPaginacion();
        return;
    }

    tablaBody.innerHTML = estudiantesPagina.map(est => `
        <tr>
            <td>${est.id}</td>
            <td>${escapeHTML(est.cedula || "")}</td>
            <td>${escapeHTML(est.apellidos || "")}</td>
            <td>${escapeHTML(est.nombres || "")}</td>
            <td>${renderSexoBadge(est.sexo)}</td>
            <td>${escapeHTML(est.correo || "")}</td>
            <td>${formatoDinero(est.pagado)}</td>
            <td>${formatoDinero(est.seguro || 0)}</td>
            <td>${escapeHTML(est.grado || "")}</td>
            <td>${renderBooleanBadge(est.cti)}</td>
            <td>${renderBooleanBadge(est.hermano)}</td>
            <td>${renderEstadoBadge(
                calcularEstado(
                    est.pagado,
                    est.seguro,
                    est.cti,
                    est.hermano,
                    obtenerDescuentoActual(est)
                )
            )}</td>
            <td class="acciones">
                ${
                    est.estado_estudiante === "eliminado"
                        ? `<button class="recuperar-btn" data-id="${est.id}" title="Recuperar"><i class="fas fa-undo"></i></button>`
                        : `
                            <button class="historial-btn" data-alumno-id="${est.alumno_id ?? est.id}" title="Ver historial académico"><i class="fas fa-clock-rotate-left"></i></button>
                            <button class="edit-btn" data-id="${est.id}" title="Editar"><i class="fas fa-pen"></i></button>
                            <button class="delete-btn" data-id="${est.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                        `
                }
            </td>
        </tr>
    `).join("");

    renderizarBotonesPaginacion();
}

export function renderizarBotonesPaginacion() {
    const contenedor = document.getElementById("paginacion");
    if (!contenedor) return;

    const totalEstudiantes = getEstudiantesGlobal().length;
    const filasPorPagina = getFilasPorPagina();
    const totalPaginas = Math.ceil(totalEstudiantes / filasPorPagina);
    const paginaActual = getPaginaActual();

    if (totalPaginas <= 1) {
        contenedor.innerHTML = "";
        return;
    }

    const botones = [];

    const pushBoton = (pagina, texto = null, activa = false, extraClass = "") => {
        const clases = [activa ? "active" : "", extraClass].filter(Boolean).join(" ");

        botones.push(`
            <button
                type="button"
                data-pagina="${pagina}"
                class="${clases}"
            >
                ${texto ?? pagina}
            </button>
        `);
    };

    const pushNav = (pagina, texto, disabled = false) => {
        botones.push(`
            <button
                type="button"
                data-pagina="${pagina}"
                class="nav-btn"
                ${disabled ? "disabled" : ""}
            >
                ${texto}
            </button>
        `);
    };

    const pushPuntos = () => {
        botones.push(`<span class="pagination-dots">...</span>`);
    };

    // Flecha izquierda
    pushNav(paginaActual - 1, "&lt;", paginaActual === 1);

    if (totalPaginas <= 7) {
        for (let i = 1; i <= totalPaginas; i++) {
            pushBoton(i, null, i === paginaActual);
        }
    } else {
        pushBoton(1, null, paginaActual === 1);

        if (paginaActual <= 3) {
            for (let i = 2; i <= 3; i++) {
                pushBoton(i, null, i === paginaActual);
            }
            pushPuntos();
            pushBoton(totalPaginas, null, paginaActual === totalPaginas);
        } else if (paginaActual >= totalPaginas - 2) {
            pushPuntos();
            for (let i = totalPaginas - 2; i <= totalPaginas; i++) {
                pushBoton(i, null, i === paginaActual);
            }
        } else {
            pushPuntos();
            for (let i = paginaActual - 1; i <= paginaActual + 1; i++) {
                pushBoton(i, null, i === paginaActual);
            }
            pushPuntos();
            pushBoton(totalPaginas, null, paginaActual === totalPaginas);
        }
    }

    // Flecha derecha
    pushNav(paginaActual + 1, "&gt;", paginaActual === totalPaginas);

    contenedor.innerHTML = botones.join("");

    contenedor.querySelectorAll("button[data-pagina]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;

            const pagina = Number(btn.dataset.pagina);
            if (!Number.isInteger(pagina) || pagina <= 0 || pagina > totalPaginas) return;

            setPaginaActual(pagina);
            renderizarPagina();
        });
    });
}