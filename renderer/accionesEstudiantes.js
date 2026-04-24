import { getEstudianteEditando } from "./state.js";
import { calcularEstado } from "./utils.js";
import {
    limpiarFormularioEstudiante,
    getHermanosSeleccionados,
    getModoRegistro
} from "./modal.js";

import {
    getAlumnoExistenteSeleccionado,
    getHermanosExistenteSeleccionados,
    limpiarBloqueExistente
} from "./rematricula.js";

import { mostrarAlerta, confirmar, mostrarToast } from "./ui.js";

function getRefs() {
    return {
        modal: document.getElementById("modal"),
        btnAgregar: document.getElementById("btnRegistrarEstudiante"),
        btnCancelar: document.getElementById("btnCancelarRegistro"),
        btnGuardar: document.getElementById("btnGuardarRegistro")
    };
}

let guardandoRegistro = false;

function construirPayloadEstudiante() {
    const nombre = document.getElementById("nombre")?.value.trim() || "";    
    const apellidos = document.getElementById("apellidos")?.value.trim() || "";
    const cedula = document.getElementById("cedula")?.value.trim() || "";
    const sexo = document.getElementById("sexo")?.value.trim() || "";
    const correo = document.getElementById("correo")?.value.trim() || "";
    const grado = document.getElementById("grado")?.value.trim() || "";
    const cti = document.getElementById("cti")?.value.trim() || "";
    const hermano = document.getElementById("hermano")?.value.trim() || "";

    return {
        nombre,
        apellidos,
        cedula,
        sexo,
        correo,
        grado,
        cti,
        hermano
    };
}

function validarFormularioEstudiante({ nombre, apellidos, cedula, correo, grado }) {
    const cedulaValida = /^[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,10})*$/i.test(cedula);
    const correoValido = !correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!nombre || !apellidos || !cedulaValida || !correoValido || !grado) {
        mostrarAlerta("Verifique que nombres, apellidos, cédula, correo y grado estén correctos.");
        return false;
    }

    return true;
}

function abrirModalEstudiante() {
    const { modal } = getRefs();
    window.scrollTo(0, 0);
    limpiarFormularioEstudiante();
    limpiarBloqueExistente();
    modal?.classList.add("activo");
}

function cerrarModalEstudiante() {
    const { modal } = getRefs();
    limpiarFormularioEstudiante();
    limpiarBloqueExistente();
    modal?.classList.remove("activo");
}

async function guardarEstudianteNuevo() {
    const { modal } = getRefs();
    const datos = construirPayloadEstudiante();

    if (!validarFormularioEstudiante(datos)) {
        return;
    }

    const descuentoHermano = "No";
    const hermanosRelacionados = getHermanosSeleccionados().map(h => h.id);

    const estudiante = {
        cedula: datos.cedula,
        apellidos: datos.apellidos,
        nombres: datos.nombre,
        sexo: datos.sexo,
        correo: datos.correo,
        pagado: 0,
        seguro: 0,
        grado: datos.grado,
        cti: datos.cti,
        hermano: datos.hermano,
        descuentoHermano,
        hermanosRelacionados,
        estado_pago: "Pendiente"
    };

    const estudianteEditando = getEstudianteEditando();

    if (estudianteEditando) {
        estudiante.id = estudianteEditando.id;
        estudiante.pagado = estudianteEditando.pagado || 0;
        estudiante.seguro = estudianteEditando.seguro || 0;
        estudiante.estado_pago = calcularEstado(
            estudiante.pagado,
            estudiante.seguro,
            datos.cti,
            datos.hermano,
            estudianteEditando.descuento_hermano ?? estudianteEditando.descuentoHermano ?? "No"
        );

        window.api.actualizarEstudiante(estudiante);
    } else {
        window.api.insertarEstudiante(estudiante);
    }

    modal?.classList.remove("activo");
}

async function guardarMatriculaExistenteDesdeModal() {
    const { modal } = getRefs();

    const alumnoSeleccionado = getAlumnoExistenteSeleccionado();
    const hermanosRelacionados = getHermanosExistenteSeleccionados().map(h => h.id);

    if (!alumnoSeleccionado) {
        mostrarAlerta("Debe seleccionar un alumno existente.");
        return;
    }

    const grado = document.getElementById("gradoAlumnoExistente")?.value.trim() || "";
    const cti = document.getElementById("ctiAlumnoExistente")?.value.trim() || "";
    const hermano = document.getElementById("hermanoAlumnoExistente")?.value.trim() || "";

    if (!grado || !cti || !hermano) {
        mostrarAlerta("Debe completar grado, CTI y hermano.");
        return;
    }

    if (hermano === "Si" && hermanosRelacionados.length === 0) {
        mostrarAlerta("Debe seleccionar al menos un hermano relacionado.");
        return;
    }

    const periodoActivo = await window.api.obtenerPeriodoActivo();

    const ok = await confirmar(
        `Se matriculará a ${alumnoSeleccionado.nombres} ${alumnoSeleccionado.apellidos} ` +
        `en el período ${periodoActivo?.nombre || "activo"} con el grado ${grado}. ¿Desea continuar?`
    );

    if (!ok) return;

    try {
        const res = await window.api.matricularAlumnoExistente({
            alumno_id: alumnoSeleccionado.id,
            grado,
            cti,
            hermano,
            hermanosRelacionados
        });

        if (!res?.success) {
            mostrarAlerta(res?.message || "No se pudo matricular el estudiante.");
            return;
        }

        limpiarFormularioEstudiante();
        limpiarBloqueExistente();

        modal?.classList.remove("activo");

        window.api.traerEstudiantes();
        mostrarToast("Estudiante matriculado correctamente.", "success");

    } catch (error) {
        console.error("Error matriculando estudiante existente:", error);
        mostrarAlerta("Ocurrió un error al matricular el estudiante.");
    }
}

async function guardarEstudiante() {
    if (guardandoRegistro) return;

    const { btnGuardar } = getRefs();

    try {
        guardandoRegistro = true;
        if (btnGuardar) btnGuardar.disabled = true;

        const modo = getModoRegistro();

        if (modo === "existente") {
            await guardarMatriculaExistenteDesdeModal();
            return;
        }

        await guardarEstudianteNuevo();
    } finally {
        guardandoRegistro = false;
        if (btnGuardar) btnGuardar.disabled = false;
    }
}

function registrarEventosCrud() {
    window.api.onErrorInsertar((mensaje) => {
        mostrarAlerta(mensaje);
    });

    window.addEventListener("solicitar-eliminar-estudiante", async (event) => {
        const id = Number(event?.detail?.id);

        if (!Number.isInteger(id) || id <= 0) {
            mostrarAlerta("No se pudo identificar la matrícula a eliminar.");
            return;
        }

        const ok = await confirmar("¿Está seguro que desea eliminar este estudiante?");
        if (!ok) return;

        try {
            const res = await window.api.eliminarEstudiante(id);

            if (res?.success) {
                window.api.traerEstudiantes();
                return;
            }

            mostrarAlerta(res?.message || "No se pudo eliminar el estudiante.");
        } catch (error) {
            console.error("Error eliminando estudiante:", error);
            mostrarAlerta("Ocurrió un error al eliminar el estudiante.");
        }
    });
}

export function initAccionesEstudiantes() {
    const { btnAgregar, btnCancelar, btnGuardar, modal } = getRefs();

    modal?.classList.remove("activo");

    btnAgregar?.addEventListener("click", abrirModalEstudiante);
    btnCancelar?.addEventListener("click", cerrarModalEstudiante);
    btnGuardar?.addEventListener("click", guardarEstudiante);

    registrarEventosCrud();
}