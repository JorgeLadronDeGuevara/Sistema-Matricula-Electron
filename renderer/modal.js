// modal.js

import { getEstudiantesGlobal, setEstudianteEditando, getEstudianteEditando } from "./state.js";
import { normalizarSiNo, escapeHTML } from "./utils.js";

let hermanosSeleccionados = [];
let selectorHermanosInicializado = false;
let modoRegistro = "nuevo";

function formatearFechaBonita(fecha) {
    if (!fecha) return "";

    const texto = String(fecha).trim();
    const partes = texto.split("-");

    if (partes.length === 3) {
        const anio = Number(partes[0]);
        const mes = Number(partes[1]) - 1;
        const dia = Number(partes[2]);

        const fechaLocal = new Date(anio, mes, dia);

        return fechaLocal.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    const fechaNormal = new Date(texto);

    if (Number.isNaN(fechaNormal.getTime())) {
        return texto;
    }

    return fechaNormal.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export function getHermanosSeleccionados() {
    return hermanosSeleccionados;
}

export function setHermanosSeleccionados(lista) {
    hermanosSeleccionados = Array.isArray(lista) ? lista : [];
    renderHermanosSeleccionados();
}

export function getModoRegistro() {
    return modoRegistro;
}

function cambiarModoRegistro(modo = "nuevo") {
    modoRegistro = modo;

    const tipoRegistroWrap = document.getElementById("tipoRegistroWrap");
    const bloqueNuevo = document.getElementById("bloqueNuevoIngreso");
    const bloqueExistente = document.getElementById("bloqueExistente");
    const tituloModal = document.getElementById("tituloModal");
    const btnGuardar = document.getElementById("btnGuardarRegistro");

    if (tipoRegistroWrap) {
        if (getEstudianteEditando()) {
            tipoRegistroWrap.classList.add("oculto");
        } else {
            tipoRegistroWrap.classList.remove("oculto");
        }
    }

    if (modo === "existente") {
        bloqueNuevo?.classList.add("oculto");
        bloqueExistente?.classList.remove("oculto");

        if (tituloModal) tituloModal.textContent = "Matricular estudiante existente";
        if (btnGuardar) btnGuardar.textContent = "Matricular";

        cargarPeriodoActivoEnBloqueExistente();
    } else {
        bloqueNuevo?.classList.remove("oculto");
        bloqueExistente?.classList.add("oculto");

        if (tituloModal) tituloModal.textContent = "Registrar estudiante";
        if (btnGuardar) btnGuardar.textContent = "Guardar";
    }
}

function limpiarBloqueExistente() {
    const ids = [
        "buscarAlumnoExistente",
        "gradoAlumnoExistente",
        "ctiAlumnoExistente",
        "hermanoAlumnoExistente",
        "buscarHermanoExistente"
    ];

    ids.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });

    const resultadosAlumnoExistente = document.getElementById("resultadosAlumnoExistente");
    const alumnoExistenteSeleccionado = document.getElementById("alumnoExistenteSeleccionado");
    const infoPeriodoMatriculaExistente = document.getElementById("infoPeriodoMatriculaExistente");
    const infoPromocionSugerida = document.getElementById("infoPromocionSugerida");
    const resultadosHermanosExistente = document.getElementById("resultadosHermanosExistente");
    const hermanosExistenteSeleccionados = document.getElementById("hermanosExistenteSeleccionados");
    const panelHermanosExistente = document.getElementById("panelHermanosExistente");

    if (resultadosAlumnoExistente) resultadosAlumnoExistente.innerHTML = "";
    if (alumnoExistenteSeleccionado) alumnoExistenteSeleccionado.innerHTML = "";
    if (infoPeriodoMatriculaExistente) {
        infoPeriodoMatriculaExistente.innerHTML = "<span>No hay período activo seleccionado.</span>";
    }
    if (infoPromocionSugerida) {
        infoPromocionSugerida.innerHTML = "<span>No hay información disponible.</span>";
    }
    if (resultadosHermanosExistente) resultadosHermanosExistente.innerHTML = "";
    if (hermanosExistenteSeleccionados) hermanosExistenteSeleccionados.innerHTML = "";
    if (panelHermanosExistente) panelHermanosExistente.style.display = "none";
}

async function cargarPeriodoActivoEnBloqueExistente() {
    const infoPeriodoMatriculaExistente = document.getElementById("infoPeriodoMatriculaExistente");
    if (!infoPeriodoMatriculaExistente) return;

    try {
        const periodoActivo = await window.api.obtenerPeriodoActivo();

        if (!periodoActivo) {
            infoPeriodoMatriculaExistente.innerHTML = "<span>No hay período activo seleccionado.</span>";
            return;
        }

        infoPeriodoMatriculaExistente.innerHTML = `
            <div class="item-hermano-seleccionado" style="margin-top:6px; padding:6px 10px; border:1px solid #ccc; border-radius:6px;">
                <strong>${escapeHTML(periodoActivo.nombre || "Sin nombre")}</strong>
                ${periodoActivo.fecha_inicio ? `<div>Inicio: ${escapeHTML(formatearFechaBonita(periodoActivo.fecha_inicio))}</div>` : ""}
                ${periodoActivo.fecha_fin ? `<div>Fin: ${escapeHTML(formatearFechaBonita(periodoActivo.fecha_fin))}</div>` : ""}
            </div>
        `;
    } catch (error) {
        console.error("Error cargando período activo en modal:", error);
        infoPeriodoMatriculaExistente.innerHTML = "<span>Error cargando período activo.</span>";
    }
}

export function abrirModalRegistro() {
    limpiarFormularioEstudiante();

    const modal = document.getElementById("modal");
    const radioNuevo = document.querySelector('input[name="tipoRegistro"][value="nuevo"]');

    if (radioNuevo) radioNuevo.checked = true;

    cambiarModoRegistro("nuevo");

    if (modal) modal.classList.add("activo");

}

function renderHermanosSeleccionados() {
    const contenedor = document.getElementById("hermanosSeleccionados");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    hermanosSeleccionados.forEach(est => {
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
            <span>${escapeHTML(est.nombres || "")} ${escapeHTML(est.apellidos || "")} - ${escapeHTML(est.cedula || "")}</span>
            <button type="button" class="quitar-hermano" data-id="${est.id}">Quitar</button>
        `;

        item.querySelector(".quitar-hermano")?.addEventListener("click", () => {
            hermanosSeleccionados = hermanosSeleccionados.filter(h => h.id !== est.id);
            renderHermanosSeleccionados();
        });

        contenedor.appendChild(item);
    });
}

function renderResultadosBusquedaHermanos(texto) {
    const resultados = document.getElementById("resultadosHermanos");
    if (!resultados) return;

    resultados.innerHTML = "";

    const termino = texto.trim().toLowerCase();
    if (!termino) return;

    const estudianteEditando = getEstudianteEditando();

    const lista = getEstudiantesGlobal().filter(est => {
        const yaSeleccionado = hermanosSeleccionados.some(h => h.id === est.id);
        const esElMismo = estudianteEditando && est.id === estudianteEditando.id;

        if (yaSeleccionado || esElMismo) return false;

        return (
            String(est.nombres || "").toLowerCase().includes(termino) ||
            String(est.apellidos || "").toLowerCase().includes(termino) ||
            String(est.cedula || "").toLowerCase().includes(termino)
        );
    });

    if (lista.length === 0) {
        resultados.innerHTML = `<div style="padding:8px;">Sin resultados</div>`;
        return;
    }

    lista.forEach(est => {
        const item = document.createElement("div");
        item.className = "item-resultado-hermano";
        item.style.padding = "8px";
        item.style.border = "1px solid #ddd";
        item.style.marginTop = "4px";
        item.style.borderRadius = "6px";
        item.style.cursor = "pointer";

        item.innerHTML = `
            <strong>${escapeHTML(est.nombres || "")} ${escapeHTML(est.apellidos || "")}</strong><br>
            <small>${escapeHTML(est.cedula || "")} · ${escapeHTML(est.grado || "")}</small>
        `;

        item.addEventListener("click", () => {
            hermanosSeleccionados.push(est);
            renderHermanosSeleccionados();
            resultados.innerHTML = "";

            const buscarHermanoInput = document.getElementById("buscarHermano");
            if (buscarHermanoInput) buscarHermanoInput.value = "";
        });

        resultados.appendChild(item);
    });
}

export function initSelectorHermanos() {
    if (selectorHermanosInicializado) return;
    selectorHermanosInicializado = true;

    const selectHermano = document.getElementById("hermano");
    const panelHermanos = document.getElementById("panelHermanos");
    const buscarHermano = document.getElementById("buscarHermano");
    const resultadosHermanos = document.getElementById("resultadosHermanos");

    if (!selectHermano || !panelHermanos || !buscarHermano || !resultadosHermanos) return;

    selectHermano.addEventListener("change", () => {
        const valor = selectHermano.value;

        if (valor === "Si") {
            panelHermanos.style.display = "block";
        } else {
            panelHermanos.style.display = "none";
            hermanosSeleccionados = [];
            renderHermanosSeleccionados();
            buscarHermano.value = "";
            resultadosHermanos.innerHTML = "";
        }
    });

    buscarHermano.addEventListener("input", () => {
        renderResultadosBusquedaHermanos(buscarHermano.value);
    });
}

export function initTipoRegistroModal() {
    const radios = document.querySelectorAll('input[name="tipoRegistro"]');
    if (!radios.length) return;

    radios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            cambiarModoRegistro(e.target.value);
        });
    });
}

export function editarEstudiante(id) {
    window.scrollTo(0, 0);

    const est = getEstudiantesGlobal().find(e => e.id === id);
    if (!est) return;

    setEstudianteEditando(est);

    cambiarModoRegistro("nuevo");

    const tipoRegistroWrap = document.getElementById("tipoRegistroWrap");
    if (tipoRegistroWrap) tipoRegistroWrap.classList.add("oculto");

    const tituloModal = document.getElementById("tituloModal");
    if (tituloModal) tituloModal.textContent = "Editar estudiante";

    const btnGuardar = document.getElementById("btnGuardarRegistro");
    if (btnGuardar) btnGuardar.textContent = "Actualizar";

    const radioNuevo = document.querySelector('input[name="tipoRegistro"][value="nuevo"]');
    if (radioNuevo) radioNuevo.checked = true;

    const campoNombre = document.getElementById("nombre");
    const campoApellidos = document.getElementById("apellidos");
    const campoCedula = document.getElementById("cedula");
    const campoSexo = document.getElementById("sexo");
    const campoCorreo = document.getElementById("correo");
    const campoGrado = document.getElementById("grado");
    const campoCti = document.getElementById("cti");
    const campoHermano = document.getElementById("hermano");
    const campoDescuentoHermano = document.getElementById("descuentoHermano");

    if (campoNombre) campoNombre.value = est.nombres || "";
    if (campoApellidos) campoApellidos.value = est.apellidos || "";
    if (campoCedula) campoCedula.value = est.cedula || "";
    if (campoSexo) campoSexo.value = est.sexo || "";
    if (campoCorreo) campoCorreo.value = est.correo || "";
    if (campoGrado) campoGrado.value = est.grado || "";
    if (campoCti) campoCti.value = normalizarSiNo(est.cti);
    if (campoHermano) campoHermano.value = normalizarSiNo(est.hermano);
    if (campoDescuentoHermano) {
        campoDescuentoHermano.value = normalizarSiNo(est.descuentoHermano ?? est.descuento_hermano ?? "No");
    }

    const panelHermanos = document.getElementById("panelHermanos");
    if (panelHermanos) {
        panelHermanos.style.display = normalizarSiNo(est.hermano) === "Si" ? "block" : "none";
    }

    ["cedula", "sexo"].forEach(idCampo => {
        const campo = document.getElementById(idCampo);
        if (campo) campo.disabled = true;
    });

    const grupoActual = est.grupoFamiliar ?? est.grupo_familiar ?? null;

    const hermanosActuales = getEstudiantesGlobal().filter(e => {
        const grupoHermano = e.grupoFamiliar ?? e.grupo_familiar ?? null;

        return (
            e.id !== est.id &&
            e.estado_estudiante === "activo" &&
            grupoActual &&
            grupoHermano === grupoActual
        );
    });

    setHermanosSeleccionados(hermanosActuales);

    const buscarHermanoInput = document.getElementById("buscarHermano");
    const resultadosHermanos = document.getElementById("resultadosHermanos");
    const modal = document.getElementById("modal");

    if (buscarHermanoInput) buscarHermanoInput.value = "";
    if (resultadosHermanos) resultadosHermanos.innerHTML = "";
    if (modal) modal.classList.add("activo");
}

export function limpiarFormularioEstudiante() {
    const tituloModal = document.getElementById("tituloModal");
    if (tituloModal) tituloModal.textContent = "Registrar estudiante";

    ["cedula", "nombre", "apellidos", "sexo", "correo", "grado", "cti", "hermano"]
        .forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = "";
        });

    const descuentoHermano = document.getElementById("descuentoHermano");
    if (descuentoHermano) descuentoHermano.value = "No";

    const panelHermanos = document.getElementById("panelHermanos");
    if (panelHermanos) panelHermanos.style.display = "none";

    const buscarHermanoInput = document.getElementById("buscarHermano");
    const resultadosHermanos = document.getElementById("resultadosHermanos");

    if (buscarHermanoInput) buscarHermanoInput.value = "";
    if (resultadosHermanos) resultadosHermanos.innerHTML = "";

    hermanosSeleccionados = [];
    renderHermanosSeleccionados();

    ["cedula", "nombre", "apellidos", "sexo"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.disabled = false;
    });

    limpiarBloqueExistente();

    const radioNuevo = document.querySelector('input[name="tipoRegistro"][value="nuevo"]');
    if (radioNuevo) radioNuevo.checked = true;

    const btnGuardar = document.getElementById("btnGuardarRegistro");
    if (btnGuardar) btnGuardar.textContent = "Guardar";

    cambiarModoRegistro("nuevo");
    setEstudianteEditando(null);
}