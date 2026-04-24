// mainRenderer.js

import {
    setEstudiantesGlobal,
    setPaginaActual,
    setModoEliminados,
    getModoEliminados
} from "./state.js";

import {
    initSelectorHermanos,
    initTipoRegistroModal,
    abrirModalRegistro,
    limpiarFormularioEstudiante
} from "./modal.js";

import {
    renderizarPagina,
} from "./tabla.js";

import {
    exportarExcelCompleto,
    exportarPDFAbonados,
    exportarPDFCancelados,
    exportarPDFPendientes,
    exportarTodosPDF
} from "./exportar.js";

import { mostrarAlerta, mostrarToast, confirmar } from "./ui.js";

import { initPagos, sincronizarEstudiantePagoDesdeLista, mostrarAccionesComprobante } from "./pagos.js";

import { actualizarStats, initDashboardCalendar } from "./dashboard.js";

import {
    cargarPeriodosEnUI,
    limpiarFormularioPeriodo,
    refrescarVistaPorPeriodo
} from "./periodos.js";

import { initAuditoria } from "./auditoria.js";

import {
    initRematricula,
    resetearEstadoRematricula
} from "./rematricula.js";

import { initHistorialAcademico } from "./historialAcademico.js";

import { initImportacionExcel } from "./importacionExcel.js";

import { initAccionesEstudiantes } from "./accionesEstudiantes.js";

import { initUsuarios } from "./usuarios.js";

let ultimoComprobanteGenerado = null;
let cierreSesionInicializado = false;


async function validarSesionRenderer() {
    try {
        const res = await window.api.getSession();

        if (!res?.logged || !res?.sesion?.usuario) {
            window.location.replace("login.html");
            return null;
        }

        return res.sesion;
    } catch (error) {
        console.error("Error validando sesión:", error);
        window.location.replace("login.html");
        return null;
    }
}

function pintarSesionEnSidebar(sesion) {
    const nombre = document.getElementById("sidebarUsuarioNombre");
    const rol = document.getElementById("sidebarUsuarioRol");

    if (nombre) {
        nombre.textContent = String(sesion?.usuario || "Sin sesión");
    }

    if (rol) {
        rol.textContent = String(sesion?.rol || "usuario");
    }
}

function initCerrarSesion() {
    if (cierreSesionInicializado) return;
    cierreSesionInicializado = true;

    const btn = document.getElementById("btnCerrarSesionSidebar");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const ok = await confirmar("¿Desea cerrar la sesión actual?");
        if (!ok) return;

        btn.disabled = true;

        try {
            const res = await window.api.logout();

            if (!res?.success) {
                mostrarAlerta(res?.message || "No se pudo cerrar la sesión.");
                btn.disabled = false;
                return;
            }

            window.location.replace("login.html");
        } catch (error) {
            console.error("Error cerrando sesión:", error);
            mostrarAlerta("Ocurrió un error al cerrar la sesión.");
            btn.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const sesion = await validarSesionRenderer();
    if (!sesion) return;

    pintarSesionEnSidebar(sesion);
    window.api.onSesionActualizada?.(pintarSesionEnSidebar);
    initCerrarSesion();

    const inputBuscar = document.getElementById("buscar");

    const modalPeriodo = document.getElementById("modalPeriodo");
    const btnNuevoPeriodo = document.getElementById("btnNuevoPeriodo");
    const btnCancelarPeriodo = document.getElementById("cancelarPeriodo");
    const btnGuardarPeriodo = document.getElementById("guardarPeriodo");
    const selectorPeriodo = document.getElementById("selectorPeriodo");

    const btnRegistrarEstudiante = document.getElementById("btnRegistrarEstudiante");
    const btnCancelarRegistro = document.getElementById("btnCancelarRegistro");
    const modal = document.getElementById("modal");

    const btnImportarExcel = document.getElementById("btnImportarExcel");

    const btnExportarMenu = document.getElementById("btnExportarMenu");
    const menuExportar = document.getElementById("menuExportar");
    const dropdownExport = document.querySelector(".dropdown-export");

    const btnExportarExcel = document.getElementById("btnExportarExcel");
    const btnExportarPDFTodos = document.getElementById("btnExportarPDFTodos");
    const btnExportarPDFPendientes = document.getElementById("btnExportarPDFPendientes");
    const btnExportarPDFAbonados = document.getElementById("btnExportarPDFAbonados");
    const btnExportarPDFCancelados = document.getElementById("btnExportarPDFCancelados");

    if (modalPeriodo) {
        modalPeriodo.classList.remove("activo");
    }

    initPagos();
    initSelectorHermanos();
    initTipoRegistroModal();
    initAuditoria();
    initRematricula();
    initHistorialAcademico();
    initImportacionExcel();
    initAccionesEstudiantes();
    initDashboardCalendar();

    if (String(sesion.rol || "").trim().toLowerCase() === "admin") {
        initUsuarios();
    } else {
        document.querySelector('[data-modulo="usuarios"]')?.remove();
        document.getElementById("vista-usuarios")?.remove();
    }

    btnImportarExcel?.addEventListener("click", async () => {
        try {
            await window.api.abrirDialogoExcel();
        } catch (error) {
            console.error("Error al abrir selector de Excel:", error);
            mostrarAlerta("No se pudo abrir el selector de archivo Excel.");
        }
    });

    btnExportarMenu?.addEventListener("click", (e) => {
        e.stopPropagation();
        menuExportar?.classList.toggle("oculto");
        dropdownExport?.classList.toggle("abierto");
    });

    document.addEventListener("click", (e) => {
        if (!dropdownExport?.contains(e.target)) {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });

    btnExportarExcel?.addEventListener("click", async () => {
        try {
            await exportarExcelCompleto();
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            mostrarAlerta("No se pudo exportar el archivo Excel.");
        } finally {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });

    btnExportarPDFTodos?.addEventListener("click", async () => {
        try {
            await exportarTodosPDF();
        } catch (error) {
            console.error("Error al exportar PDF de todos:", error);
            mostrarAlerta("No se pudo exportar el PDF de todos.");
        } finally {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });

    btnExportarPDFPendientes?.addEventListener("click", async () => {
        try {
            await exportarPDFPendientes();
        } catch (error) {
            console.error("Error al exportar PDF pendientes:", error);
            mostrarAlerta("No se pudo exportar el PDF de pendientes.");
        } finally {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });

    btnExportarPDFAbonados?.addEventListener("click", async () => {
        try {
            await exportarPDFAbonados();
        } catch (error) {
            console.error("Error al exportar PDF abonados:", error);
            mostrarAlerta("No se pudo exportar el PDF de abonados.");
        } finally {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });

    btnExportarPDFCancelados?.addEventListener("click", async () => {
        try {
            await exportarPDFCancelados();
        } catch (error) {
            console.error("Error al exportar PDF cancelados:", error);
            mostrarAlerta("No se pudo exportar el PDF de cancelados.");
        } finally {
            menuExportar?.classList.add("oculto");
            dropdownExport?.classList.remove("abierto");
        }
    });


    btnRegistrarEstudiante?.addEventListener("click", () => {
        abrirModalRegistro();
    });

    btnCancelarRegistro?.addEventListener("click", () => {
        limpiarFormularioEstudiante();
        if (modal) modal.classList.remove("activo");
    });

    const btnVerComprobante = document.getElementById("btnVerComprobante");


    btnVerComprobante?.addEventListener("click", async () => {
        if (!ultimoComprobanteGenerado) {
            mostrarAlerta("No hay comprobante generado para visualizar.");
            return;
        }

        btnVerComprobante.disabled = true;

        try {
            const res = await window.api.abrirVistaPreviaComprobante(ultimoComprobanteGenerado);

            if (!res?.success) {
                mostrarAlerta(res?.message || "No se pudo abrir la vista previa del comprobante.");
            }
        } catch (error) {
            console.error(error);
            mostrarAlerta("Ocurrió un error al abrir la vista previa.");
        } finally {
            btnVerComprobante.disabled = false;
        }
    });

    btnNuevoPeriodo?.addEventListener("click", () => {
        limpiarFormularioPeriodo();
        if (modalPeriodo) modalPeriodo.classList.add("activo");
    });

    btnCancelarPeriodo?.addEventListener("click", () => {
        if (modalPeriodo) modalPeriodo.classList.remove("activo");
    });

    btnGuardarPeriodo?.addEventListener("click", async () => {
        const nombre = document.getElementById("nombrePeriodo")?.value.trim();
        const fecha_inicio = document.getElementById("fechaInicioPeriodo")?.value || "";
        const fecha_fin = document.getElementById("fechaFinPeriodo")?.value || "";

        if (!nombre) {
            mostrarAlerta("Debe ingresar el nombre del período.");
            return;
        }

        btnGuardarPeriodo.disabled = true;

        try {
            const res = await window.api.crearPeriodoAcademico({
                nombre,
                fecha_inicio,
                fecha_fin
            });

            if (!res?.success) {
                mostrarAlerta(res?.message || "No se pudo crear el período.");
                return;
            }

            if (modalPeriodo) modalPeriodo.classList.remove("activo");
            await cargarPeriodosEnUI();
            mostrarAlerta(`Período ${nombre} creado correctamente.`);
        } catch (error) {
            console.error("Error creando período:", error);
            mostrarAlerta("Ocurrió un error al crear el período.");
        } finally {
            btnGuardarPeriodo.disabled = false;
        }
    });

    selectorPeriodo?.addEventListener("change", async () => {
        const periodoId = Number(selectorPeriodo.value);

        if (!Number.isInteger(periodoId)) return;

        selectorPeriodo.disabled = true;

        try {
            const res = await window.api.cambiarPeriodoActivo(periodoId);

            if (!res?.success) {
                mostrarAlerta(res?.message || "No se pudo cambiar el período activo.");
                await cargarPeriodosEnUI();
                return;
            }

            await refrescarVistaPorPeriodo({
                onResetEstado: () => {
                    ultimoComprobanteGenerado = null;
                    resetearEstadoRematricula();
                }
            });

        } catch (error) {
            console.error("Error cambiando período activo:", error);
            mostrarAlerta("Ocurrió un error al cambiar el período activo.");
            await cargarPeriodosEnUI();
        } finally {
            selectorPeriodo.disabled = false;
        }
    });

    

    const btnRecuperar = document.getElementById("btnRecuperar");

    btnRecuperar?.addEventListener("click", () => {
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
        actualizarStats();
    });

    
    window.api.onEstudiantesInsertados?.((resumen) => {
        console.log("IMPORTACION LISTENER MAINRENDERER", resumen);
        console.log("Resumen de importación:", resumen);

        const creadas = Number(resumen?.matriculasCreadas || 0);
        const errores = Array.isArray(resumen?.errores) ? resumen.errores.length : 0;
        const omitidos = Number(resumen?.omitidos || 0);

        if (errores > 0) {
            mostrarToast(
                `Importación completada con observaciones. ${creadas} matrículas creadas, ${errores} errores.`,
                "warning"
            );
        } else if (omitidos > 0) {
            mostrarToast(
                `Importación exitosa. ${creadas} matrículas creadas, ${omitidos} omitidas.`,
                "success"
            );
        } else {
            mostrarToast(
                `Importación exitosa. ${creadas} matrículas creadas.`,
                "success"
            );
        }

        window.api.traerEstudiantes();
    });

    window.api.onEstudianteInsertado?.(() => {
        mostrarToast("Estudiante registrado correctamente.", "success");
        window.api.traerEstudiantes();
    });

    window.api.onEstudianteActualizado?.(() => {
    // 🚫 NO mostrar toast si viene de pago
    if (!window.__pagoEnProcesoGlobal) {
        mostrarToast("Estudiante actualizado correctamente.", "success");
    }

    window.api.traerEstudiantes();
});

    window.api.onComprobanteGenerado((comprobante) => {
        ultimoComprobanteGenerado = comprobante;
        mostrarAccionesComprobante();
    });

    refrescarVistaPorPeriodo({
        onResetEstado: () => {
            ultimoComprobanteGenerado = null;
            resetearEstadoRematricula();
        }
    });

    window.api.onListaEstudiantes((lista) => {
        setEstudiantesGlobal(lista);
        setPaginaActual(1);
        renderizarPagina();
        actualizarStats();

        const vistaPagosActiva = document
        .getElementById("vista-pagos")
        ?.classList.contains("activa");

        if (vistaPagosActiva) {
            sincronizarEstudiantePagoDesdeLista(lista);
        }
    });
    
    // ----- BUSCADOR -----
    if (inputBuscar) {
        inputBuscar.addEventListener("input", () => {
            const termino = String(inputBuscar.value || "").trim();
            window.api.buscarEstudiantes(termino);
        });
    }

    // ===== SIDEBAR / CAMBIO DE MÓDULOS =====
    const sidebar = document.querySelector(".sidebar");

    if (sidebar) {
        const items = sidebar.querySelectorAll("li");
        const vistas = document.querySelectorAll(".vista");
        const titulo = document.getElementById("tituloModulo");

        function activarModulo(modulo) {
            vistas.forEach(v => v.classList.remove("activa"));
            items.forEach(i => i.classList.remove("activo"));

            const vista = document.getElementById("vista-" + modulo);
            const item = sidebar.querySelector(`[data-modulo="${modulo}"]`);

            if (vista) vista.classList.add("activa");
            if (item) {
                item.classList.add("activo");
                if (titulo) {
                    titulo.textContent = item.dataset.titulo || item.textContent.trim();
                }
            }
        }

        items.forEach(item => {
            item.addEventListener("click", () => {
                activarModulo(item.dataset.modulo);
            });
        });

        // ✅ Siempre iniciar en Dashboard
        activarModulo("dashboard");
    }

    const btnIrEstudiantes = document.getElementById("btnIrEstudiantes");
    const btnIrPagos = document.getElementById("btnIrPagos");

    btnIrEstudiantes?.addEventListener("click", () => {
        const item = document.querySelector('[data-modulo="estudiantes"]');
        item?.click();
    });

    btnIrPagos?.addEventListener("click", () => {
        const item = document.querySelector('[data-modulo="pagos"]');
        item?.click();
    });

});

