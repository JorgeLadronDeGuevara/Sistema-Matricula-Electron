import { getEstudiantesGlobal } from "./state.js";

let alumnoExistenteSeleccionado = null;
let hermanosExistenteSeleccionados = [];

function getRefs() {
    return {
        buscarAlumnoExistente: document.getElementById("buscarAlumnoExistente"),
        resultadosAlumnoExistente: document.getElementById("resultadosAlumnoExistente"),
        alumnoExistenteSeleccionadoBox: document.getElementById("alumnoExistenteSeleccionado"),
        gradoAlumnoExistente: document.getElementById("gradoAlumnoExistente"),
        ctiAlumnoExistente: document.getElementById("ctiAlumnoExistente"),
        hermanoAlumnoExistente: document.getElementById("hermanoAlumnoExistente"),
        panelHermanosExistente: document.getElementById("panelHermanosExistente"),
        buscarHermanoExistente: document.getElementById("buscarHermanoExistente"),
        resultadosHermanosExistente: document.getElementById("resultadosHermanosExistente"),
        hermanosExistenteSeleccionadosBox: document.getElementById("hermanosExistenteSeleccionados"),
        infoPromocionSugerida: document.getElementById("infoPromocionSugerida"),
        infoPeriodoMatriculaExistente: document.getElementById("infoPeriodoMatriculaExistente")
    };
}

export function resetearEstadoRematricula() {
    alumnoExistenteSeleccionado = null;
    hermanosExistenteSeleccionados = [];
}

export function getAlumnoExistenteSeleccionado() {
    return alumnoExistenteSeleccionado;
}

export function getHermanosExistenteSeleccionados() {
    return hermanosExistenteSeleccionados;
}

export function limpiarBloqueExistente() {
    const {
        buscarAlumnoExistente,
        resultadosAlumnoExistente,
        alumnoExistenteSeleccionadoBox,
        gradoAlumnoExistente,
        ctiAlumnoExistente,
        hermanoAlumnoExistente,
        panelHermanosExistente,
        buscarHermanoExistente,
        resultadosHermanosExistente,
        hermanosExistenteSeleccionadosBox,
        infoPromocionSugerida,
        infoPeriodoMatriculaExistente
    } = getRefs();

    resetearEstadoRematricula();

    if (buscarAlumnoExistente) buscarAlumnoExistente.value = "";
    if (resultadosAlumnoExistente) resultadosAlumnoExistente.innerHTML = "";
    if (gradoAlumnoExistente) gradoAlumnoExistente.value = "";
    if (ctiAlumnoExistente) ctiAlumnoExistente.value = "";
    if (hermanoAlumnoExistente) hermanoAlumnoExistente.value = "";
    if (buscarHermanoExistente) buscarHermanoExistente.value = "";
    if (resultadosHermanosExistente) resultadosHermanosExistente.innerHTML = "";
    if (panelHermanosExistente) panelHermanosExistente.style.display = "none";

    if (alumnoExistenteSeleccionadoBox) {
        alumnoExistenteSeleccionadoBox.innerHTML = "<span>No hay alumno seleccionado.</span>";
    }

    if (hermanosExistenteSeleccionadosBox) {
        hermanosExistenteSeleccionadosBox.innerHTML = "";
    }
    if (infoPromocionSugerida) {
        infoPromocionSugerida.innerHTML = "<span>No hay información disponible.</span>";
    }

    if (infoPeriodoMatriculaExistente) {
        infoPeriodoMatriculaExistente.innerHTML = "<span>No hay período activo seleccionado.</span>";
    }
}

export async function renderPeriodoActivoMatriculaExistente() {
    const { infoPeriodoMatriculaExistente } = getRefs();
    if (!infoPeriodoMatriculaExistente) return;

    try {
        const periodoActivo = await window.api.obtenerPeriodoActivo();
        console.log("Periodo activo en rematricula:", periodoActivo);

        if (!periodoActivo) {
            infoPeriodoMatriculaExistente.innerHTML = "<span>No hay período activo seleccionado.</span>";
            return;
        }

        infoPeriodoMatriculaExistente.innerHTML = `
            <div class="item-hermano-seleccionado" style="margin-top:6px; padding:6px 10px; border:1px solid #ccc; border-radius:6px;">
                <strong>${periodoActivo.nombre || "Sin nombre"}</strong>
                ${periodoActivo.fecha_inicio ? `<div>Inicio: ${periodoActivo.fecha_inicio}</div>` : ""}
                ${periodoActivo.fecha_fin ? `<div>Fin: ${periodoActivo.fecha_fin}</div>` : ""}
            </div>
        `;
    } catch (error) {
        console.error("Error obteniendo período activo para rematrícula:", error);
        infoPeriodoMatriculaExistente.innerHTML = "<span>Error cargando período activo.</span>";
    }
}

export function renderAlumnoExistenteSeleccionado() {
    const { alumnoExistenteSeleccionadoBox } = getRefs();
    if (!alumnoExistenteSeleccionadoBox) return;

    if (!alumnoExistenteSeleccionado) {
        alumnoExistenteSeleccionadoBox.innerHTML = "<span>No hay alumno seleccionado.</span>";
        return;
    }

    alumnoExistenteSeleccionadoBox.innerHTML = `
        <div class="item-hermano-seleccionado" style="margin-top:6px; padding:6px 10px; border:1px solid #ccc; border-radius:6px;">
            ${alumnoExistenteSeleccionado.nombres} ${alumnoExistenteSeleccionado.apellidos} - ${alumnoExistenteSeleccionado.cedula}
        </div>
    `;
}

export function renderInfoPromocionSugerida() {
    const { infoPromocionSugerida } = getRefs();
    if (!infoPromocionSugerida) return;

    if (!alumnoExistenteSeleccionado) {
        infoPromocionSugerida.innerHTML = "<span>No hay información disponible.</span>";
        return;
    }

    const ultimoGrado = alumnoExistenteSeleccionado.ultimo_grado || "No registrado";
    const ultimoPeriodo = alumnoExistenteSeleccionado.ultimo_periodo || "No registrado";
    const ultimoCti = alumnoExistenteSeleccionado.ultimo_cti || "No registrado";
    const ultimoHermano = alumnoExistenteSeleccionado.ultimo_hermano || "No registrado";
    const gradoSugerido = alumnoExistenteSeleccionado.grado_sugerido || "Sin sugerencia";

    let mensajeExtra = "";
    if (gradoSugerido === "Egresado") {
        mensajeExtra = `
            <div style="margin-top:6px; color:#b45309; font-weight:600;">
                Atención: el último grado registrado sugiere que este estudiante podría ser egresado. Verifique con el colegio antes de matricular.
            </div>
        `;
    }

    infoPromocionSugerida.innerHTML = `
        <div style="padding:6px 10px; border:1px solid #ccc; border-radius:6px;">
            <div><strong>Último período:</strong> ${ultimoPeriodo}</div>
            <div><strong>Último grado:</strong> ${ultimoGrado}</div>
            <div><strong>Último CTI:</strong> ${ultimoCti}</div>
            <div><strong>Último Hermano:</strong> ${ultimoHermano}</div>
            <div><strong>Grado sugerido:</strong> ${gradoSugerido}</div>
            ${mensajeExtra}
        </div>
    `;
}

export function renderHermanosExistenteSeleccionados() {
    const { hermanosExistenteSeleccionadosBox } = getRefs();
    if (!hermanosExistenteSeleccionadosBox) return;

    hermanosExistenteSeleccionadosBox.innerHTML = "";

    hermanosExistenteSeleccionados.forEach(est => {
        const item = document.createElement("div");
        item.className = "item-hermano-seleccionado";
        item.style.marginTop = "6px";
        item.style.padding = "6px 10px";
        item.style.border = "1px solid #ccc";
        item.style.borderRadius = "6px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";

        item.innerHTML = `
            <span>${est.nombres} ${est.apellidos} - ${est.cedula}</span>
            <button type="button" data-id="${est.id}">Quitar</button>
        `;

        item.querySelector("button")?.addEventListener("click", () => {
            hermanosExistenteSeleccionados = hermanosExistenteSeleccionados.filter(h => h.id !== est.id);
            renderHermanosExistenteSeleccionados();
        });

        hermanosExistenteSeleccionadosBox.appendChild(item);
    });
}

async function buscarAlumnoExistenteHandler() {
    const {
        buscarAlumnoExistente,
        resultadosAlumnoExistente,
        gradoAlumnoExistente,
        ctiAlumnoExistente,
        hermanoAlumnoExistente,
        panelHermanosExistente,
        buscarHermanoExistente,
        resultadosHermanosExistente
    } = getRefs();

    const termino = buscarAlumnoExistente?.value.trim() || "";

    if (!termino) {
        if (resultadosAlumnoExistente) resultadosAlumnoExistente.innerHTML = "";
        return;
    }

    const res = await window.api.buscarAlumnosGlobal(termino);

    if (!res?.success || !Array.isArray(res.resultados) || res.resultados.length === 0) {
        if (resultadosAlumnoExistente) {
            resultadosAlumnoExistente.innerHTML = `<div style="padding:8px;">Sin resultados</div>`;
        }
        return;
    }

    if (!resultadosAlumnoExistente) return;

    resultadosAlumnoExistente.innerHTML = res.resultados.map(al => `
        <div class="item-resultado-hermano" data-id="${al.id}" style="padding:8px; border:1px solid #ddd; margin-top:4px; border-radius:6px; cursor:pointer;">
            <strong>${al.nombres} ${al.apellidos}</strong><br>
            <small>${al.cedula}</small>
        </div>
    `).join("");

    resultadosAlumnoExistente.querySelectorAll("[data-id]").forEach(item => {
        item.addEventListener("click", () => {
            const id = Number(item.dataset.id);
            alumnoExistenteSeleccionado = res.resultados.find(a => Number(a.id) === id) || null;

            resultadosAlumnoExistente.innerHTML = "";
            buscarAlumnoExistente.value = "";

            renderAlumnoExistenteSeleccionado();
            renderInfoPromocionSugerida();

            if (
                gradoAlumnoExistente &&
                alumnoExistenteSeleccionado?.grado_sugerido &&
                alumnoExistenteSeleccionado.grado_sugerido !== "Egresado"
            ) {
                gradoAlumnoExistente.value = alumnoExistenteSeleccionado.grado_sugerido;
            } else if (gradoAlumnoExistente) {
                gradoAlumnoExistente.value = alumnoExistenteSeleccionado?.ultimo_grado || "";
            }

            if (ctiAlumnoExistente) {
                ctiAlumnoExistente.value = alumnoExistenteSeleccionado?.ultimo_cti || "";
            }

            if (hermanoAlumnoExistente) {
                hermanoAlumnoExistente.value = alumnoExistenteSeleccionado?.ultimo_hermano || "";

                if (hermanoAlumnoExistente.value === "Si") {
                    if (panelHermanosExistente) {
                        panelHermanosExistente.style.display = "block";
                    }
                } else {
                    if (panelHermanosExistente) {
                        panelHermanosExistente.style.display = "none";
                    }
                    hermanosExistenteSeleccionados = [];
                    renderHermanosExistenteSeleccionados();
                    if (buscarHermanoExistente) buscarHermanoExistente.value = "";
                    if (resultadosHermanosExistente) resultadosHermanosExistente.innerHTML = "";
                }
            }
        });
    });
}

function buscarHermanoExistenteHandler() {
    const {
        buscarHermanoExistente,
        resultadosHermanosExistente
    } = getRefs();

    const termino = buscarHermanoExistente?.value.trim().toLowerCase() || "";

    if (!termino) {
        if (resultadosHermanosExistente) resultadosHermanosExistente.innerHTML = "";
        return;
    }

    const lista = getEstudiantesGlobal().filter(est => {
        const yaSeleccionado = hermanosExistenteSeleccionados.some(h => h.id === est.id);
        const esMismoAlumno =
            alumnoExistenteSeleccionado &&
            String(est.cedula || "").trim() === String(alumnoExistenteSeleccionado.cedula || "").trim();

        if (yaSeleccionado || esMismoAlumno) return false;

        return (
            String(est.nombres || "").toLowerCase().includes(termino) ||
            String(est.apellidos || "").toLowerCase().includes(termino) ||
            String(est.cedula || "").toLowerCase().includes(termino)
        );
    });

    if (lista.length === 0) {
        resultadosHermanosExistente.innerHTML = `<div style="padding:8px;">Sin resultados</div>`;
        return;
    }

    resultadosHermanosExistente.innerHTML = lista.map(est => `
        <div class="item-resultado-hermano" data-id="${est.id}" style="padding:8px; border:1px solid #ddd; margin-top:4px; border-radius:6px; cursor:pointer;">
            <strong>${est.nombres} ${est.apellidos}</strong><br>
            <small>${est.cedula} · ${est.grado}</small>
        </div>
    `).join("");

    resultadosHermanosExistente.querySelectorAll("[data-id]").forEach(item => {
        item.addEventListener("click", () => {
            const id = Number(item.dataset.id);
            const seleccionado = lista.find(e => Number(e.id) === id);
            if (!seleccionado) return;

            hermanosExistenteSeleccionados.push(seleccionado);
            renderHermanosExistenteSeleccionados();
            resultadosHermanosExistente.innerHTML = "";
            buscarHermanoExistente.value = "";
        });
    });
}

function cambiarHermanoExistenteHandler() {
    const {
        hermanoAlumnoExistente,
        panelHermanosExistente,
        buscarHermanoExistente,
        resultadosHermanosExistente
    } = getRefs();

    if (hermanoAlumnoExistente?.value === "Si") {
        if (panelHermanosExistente) {
            panelHermanosExistente.style.display = "block";
        }
    } else {
        if (panelHermanosExistente) {
            panelHermanosExistente.style.display = "none";
        }
        hermanosExistenteSeleccionados = [];
        renderHermanosExistenteSeleccionados();
        if (buscarHermanoExistente) buscarHermanoExistente.value = "";
        if (resultadosHermanosExistente) resultadosHermanosExistente.innerHTML = "";
    }
}


export function initRematricula() {
    const {
        buscarAlumnoExistente,
        hermanoAlumnoExistente,
        buscarHermanoExistente
    } = getRefs();

    buscarAlumnoExistente?.addEventListener("input", buscarAlumnoExistenteHandler);
    hermanoAlumnoExistente?.addEventListener("change", cambiarHermanoExistenteHandler);
    buscarHermanoExistente?.addEventListener("input", buscarHermanoExistenteHandler);
}