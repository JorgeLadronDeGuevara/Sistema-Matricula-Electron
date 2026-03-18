// mainRenderer.js
import {
    setEstudiantesGlobal, getEstudiantesGlobal,
    setPaginaActual, getPaginaActual,
    setFilasPorPagina, getFilasPorPagina,
    getEstudianteEditando, setEstudianteEditando,
    setModoEliminados, getModoEliminados
} from "./state.js";

import {
    sanitizarTexto,
    escapeHTML,
    formatoDinero,
    normalizarSiNo,
    calcularEstado,
    obtenerLimites
} from "./utils.js";

import {
    calcularFaltante,
    validarPago
} from "./modal.js";

import {
    renderizarPagina,
    renderizarBotonesPaginacion
} from "./tabla.js";

import {
    exportarExcelCompleto,
    exportarPDFAbonados,
    exportarPDFCancelados,
    exportarPDFPendientes,
    exportarPDFPersonalizado,
    exportarPDFPorEstado,
    exportarTodosPDF
} from "./exportar.js";

import { mostrarAlerta, confirmar } from "./ui.js";

let estudianteEditando = null;

const LIMITE_MATRICULA = 17;
const LIMITE_SEGURO = 4.50;
const TOTAL_PAGO = LIMITE_MATRICULA + LIMITE_SEGURO;

document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modal");
    const btnAgregar = document.getElementById("btnAgregar");
    const btnCancelar = document.getElementById("cancelar");
    const btnGuardar = document.getElementById("guardar");
    const inputBuscar = document.getElementById("buscar");
    const tablaBody = document.querySelector("#tablaEstudiantes tbody");
    modal.style.display = "none";

    // Inputs de agregar
    const inputAgregarMatricula = document.getElementById("pagado");
    const inputAgregarSeguro = document.getElementById("seguro");

    // Inputs de editar
    const inputEditarMatricula = document.getElementById("nuevoPagoMatricula");
    const inputEditarSeguro = document.getElementById("nuevoPagoSeguro");

    // AGREGAR
    validarPago(inputAgregarMatricula, "matricula");
    validarPago(inputAgregarSeguro, "seguro");

    // EDITAR
    validarPago(inputEditarMatricula, "matricula", document.getElementById("matriculaActual"));
    validarPago(inputEditarSeguro, "seguro", document.getElementById("seguroActual"));

    function actualizarLimitesInputs() {
        const limites = obtenerLimites(
            document.getElementById("cit").value,
            document.getElementById("hermano").value
        );

        inputAgregarMatricula.max = limites.matricula;
        inputAgregarSeguro.max = limites.seguro;

        if (inputEditarMatricula) inputEditarMatricula.max = limites.matricula;
        if (inputEditarSeguro) inputEditarSeguro.max = limites.seguro;
    }

    const btnRecuperar = document.getElementById("btnRecuperar");

    btnRecuperar.addEventListener("click", () => {
        if (!getModoEliminados()) {
            window.api.traerEliminados();
            setModoEliminados(true);
            btnRecuperar.innerHTML = '<i class="fas fa-arrow-left"></i> Página Principal';
            btnRecuperar.classList.add("modo-eliminados");
        } else {
            window.api.traerEstudiantes();
            setModoEliminados(false);
            btnRecuperar.innerHTML = '<i class="fas fa-undo"></i> Recuperar estudiantes';
            btnRecuperar.classList.remove("modo-eliminados");
        }
    });

    // Recibir la lista de eliminados del main
    window.api.onListaEliminados((lista) => {
        setEstudiantesGlobal(lista);
        setPaginaActual(1);
        renderizarPagina();
    });

    document.getElementById("cit").addEventListener("change", () => {
        actualizarLimitesInputs();
        calcularFaltante();
    });

    document.getElementById("hermano").addEventListener("change", () => {
        actualizarLimitesInputs();
        calcularFaltante();
    });

    // ===== FUNCIÓN PARA ACTUALIZAR ESTADÍSTICAS =====
    function actualizarStats() {
        const estudiantes = getEstudiantesGlobal();
        let total = estudiantes.length;
        let pendientes = 0;
        let cancelados = 0;
        let abonados = 0;
        let totalMatriculas = 0;
        let totalSeguros = 0;

        estudiantes.forEach(est => {
            const estadoReal = calcularEstado(est.pagado, est.seguro, est.cit, est.hermano);

            if (estadoReal === "Pendiente") pendientes++;
            else if (estadoReal === "Cancelado") cancelados++;
            else if (estadoReal === "Abonado") abonados++;

            totalMatriculas += Number(est.pagado) || 0;
            totalSeguros += Number(est.seguro) || 0;
        });

        document.getElementById("totalEstudiantes").textContent = total;
        document.getElementById("totalPendientes").textContent = pendientes;
        document.getElementById("totalCancelados").textContent = cancelados;
        document.getElementById("totalAbonados").textContent = abonados;
        document.getElementById("totalMatriculas").textContent = "$" + totalMatriculas.toFixed(2);
        document.getElementById("totalSeguros").textContent = "$" + totalSeguros.toFixed(2);
    }

    // ----- MODAL -----
    btnAgregar.addEventListener("click", () => {
        window.scrollTo(0, 0);
        estudianteEditando = null;
        document.getElementById("seccionNuevo").style.display = "block";
        document.getElementById("seccionEdicion").style.display = "none";

        ["cedula", "nombre", "apellidos", "sexo", "correo", "grado", "pagado", "seguro", "cit", "hermano"]
            .forEach(id => document.getElementById(id).value = "");
        ["cedula", "nombre", "apellidos", "sexo"].forEach(id => document.getElementById(id).disabled = false);

        modal.style.display = "flex";
        calcularFaltante();
    });

    btnCancelar.addEventListener("click", () => modal.style.display = "none");

    btnGuardar.addEventListener("click", () => {
        let matricula = 0;
        let seguro = 0;

        if (getEstudianteEditando()) {
            const matriculaActual = Number(document.getElementById("matriculaActual").value) || 0;
            const seguroActual = Number(document.getElementById("seguroActual").value) || 0;
            const nuevoPagoMatricula = Number(document.getElementById("nuevoPagoMatricula").value) || 0;
            const nuevoPagoSeguro = Number(document.getElementById("nuevoPagoSeguro").value) || 0;

            const limites = obtenerLimites(
                document.getElementById("cit").value,
                document.getElementById("hermano").value
            );

            matricula = Math.min(matriculaActual + nuevoPagoMatricula, limites.matricula);
            seguro = Math.min(seguroActual + nuevoPagoSeguro, limites.seguro);
        } else {
            const limites = obtenerLimites(
                document.getElementById("cit").value,
                document.getElementById("hermano").value
            );

            matricula = Math.min(Number(document.getElementById("pagado").value) || 0, limites.matricula);
            seguro = Math.min(Number(document.getElementById("seguro").value) || 0, limites.seguro);
        }

        if (!getEstudianteEditando()) {
            const cedulaValida = /^\d{1,2}-\d{3,4}-\d{3,4}$/.test(document.getElementById("cedula").value.trim());
            const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(document.getElementById("correo").value.trim());

            if (!document.getElementById("nombre").value.trim() ||
                !document.getElementById("apellidos").value.trim() ||
                !cedulaValida || !correoValido
            ) {
                mostrarAlerta("Verifique que nombres, apellidos, cédula y correo estén correctos.");                
                return;
            }
        }

        const estudiante = {
            cedula: document.getElementById("cedula").value.trim(),
            apellidos: document.getElementById("apellidos")?.value.trim() || "",
            nombres: document.getElementById("nombre").value.trim(),
            sexo: document.getElementById("sexo")?.value.trim() || "",
            correo: document.getElementById("correo")?.value.trim() || "",
            pagado: matricula,
            seguro: seguro,
            grado: document.getElementById("grado").value.trim(),
            cit: document.getElementById("cit").value.trim(),
            hermano: document.getElementById("hermano")?.value.trim() || "",
            estado_pago: calcularEstado(
                matricula,
                seguro,
                document.getElementById("cit").value,
                document.getElementById("hermano").value
            )
        };

        if (getEstudianteEditando()) {
            estudiante.id = getEstudianteEditando().id;
            window.api.actualizarEstudiante(estudiante);
        } else {
            window.api.insertarEstudiante(estudiante);
        }

        setEstudianteEditando(null);
        modal.style.display = "none";

        console.log("Estudiante enviado:", estudiante);
        actualizarStats();
    });

    // ----- CARGA EXCEL -----
    window.api.onCargarExcel(async (rutaArchivo) => {
        const data = await window.api.leerArchivo(rutaArchivo);
        const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const datos = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

        if (datos.length > 5000) {
            mostrarAlerta("El archivo Excel tiene demasiadas filas (máx 5000)");            
            return;
        }

        const cedsExistentes = new Set(getEstudiantesGlobal().map(e => e.cedula));
        const estudiantesExcel = datos
            .map(d => ({
                cedula: sanitizarTexto(d["Cedula"]),
                apellidos: sanitizarTexto(d["Apellidos"]),
                nombres: sanitizarTexto(d["Nombres"]),
                sexo: sanitizarTexto(d["Sexo"]),
                correo: sanitizarTexto(d["Correo"]),
                pagado: Number(d["Matricula"] || 0),
                seguro: Number(d["Seguro"] || 0),
                grado: sanitizarTexto(d["Grado"]),
                cit: normalizarSiNo(d["CIT"]),
                hermano: normalizarSiNo(d["HERMANO"]),
                estado_pago: calcularEstado(
                    Number(d["Matricula"] || 0),
                    Number(d["Seguro"] || 0),
                    normalizarSiNo(d["CIT"]),
                    normalizarSiNo(d["HERMANO"])
                )
            }))
            .filter(e => !cedsExistentes.has(e.cedula));

        if (estudiantesExcel.length > 0) {
            window.api.insertarMuchosEstudiantes(estudiantesExcel);
        }
    });

    // ----- EXPORTACIONES -----
    window.api.onExportarPDF(exportarTodosPDF);
    window.api.onExportarPDFCancelados(exportarPDFCancelados);
    window.api.onExportarPDFDeudores(exportarPDFPendientes);
    window.api.onExportarPDFAbonados(exportarPDFAbonados);
    window.api.onExportarExcel(exportarExcelCompleto);

    // ----- TRAER ESTUDIANTES -----
    // ----- TRAER ESTUDIANTES -----

window.api.traerEstudiantes();

window.api.onListaEstudiantes((lista) => {

    setEstudiantesGlobal(lista);
    setPaginaActual(1);

    renderizarPagina();
    actualizarStats();

});
    
    // ----- BUSCADOR -----
    if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
        const termino = inputBuscar.value
            .toLowerCase()
            .replace(/[-°\s]/g, ""); // 🔥 normaliza igual que el backend

        window.api.buscarEstudiantes(termino);
    });
}

});

// ----- ELIMINAR ESTUDIANTE -----
window.eliminarEstudiante = async function (id) {
    const ok = await confirmar("¿Está seguro que desea eliminar este estudiante?");
    if (!ok) return;    

    const res = await window.api.eliminarEstudiante(id);

    if (res?.success) {
        window.api.traerEstudiantes();
    }
    return res;
    //setTimeout(() => window.api.traerEstudiantes(), 200);
};

document.getElementById("nuevoPagoMatricula")?.addEventListener("input", calcularFaltante);
document.getElementById("nuevoPagoSeguro")?.addEventListener("input", calcularFaltante);

window.api.onEstudianteActualizado(() => window.api.traerEstudiantes());
window.api.onEstudianteInsertado(() => window.api.traerEstudiantes());