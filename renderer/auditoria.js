let historialGlobal = [];
let auditoriaInicializada = false;

function escapeHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obtenerClaseAccion(accion) {
    switch (String(accion || "").toUpperCase()) {
        case "INSERTAR":
            return "auditoria-badge insertar";
        case "ACTUALIZAR":
            return "auditoria-badge actualizar";
        case "ELIMINAR":
            return "auditoria-badge eliminar";
        case "RECUPERAR":
            return "auditoria-badge recuperar";

        case "LOGIN":
            return "auditoria-badge login";
        case "LOGOUT":
            return "auditoria-badge logout";
        case "LOGIN_FALLIDO":
        case "LOGIN_BLOQUEADO":
            return "auditoria-badge alerta";

        case "CREAR_PERIODO":
        case "CAMBIAR_PERIODO":
        case "BACKUP":
        case "RESTAURAR_BACKUP":
        case "IMPORTAR_EXCEL":
        case "MATRICULAR_EXISTENTE":
        case "REGISTRAR_ESTUDIANTE":
            return "auditoria-badge sistema";

        default:
            return "auditoria-badge default";
    }
}

function formatearFechaAuditoria(fecha) {
    if (!fecha) return "—";

    const valor = String(fecha).trim();
    let date = null;

    if (valor.endsWith("Z") || valor.includes("T")) {
        date = new Date(valor);
    } else {
        const [fechaParte, horaParte = "00:00:00"] = valor.split(" ");
        const [anio, mes, dia] = fechaParte.split("-").map(Number);
        const [hora, minuto, segundo] = horaParte.split(":").map(Number);

        date = new Date(anio, (mes || 1) - 1, dia || 1, hora || 0, minuto || 0, segundo || 0);
    }

    if (Number.isNaN(date?.getTime?.())) return "—";

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = date.getFullYear();

    let horas = date.getHours();
    const minutos = String(date.getMinutes()).padStart(2, "0");
    const ampm = horas >= 12 ? "PM" : "AM";

    horas = horas % 12;
    if (horas === 0) horas = 12;

    return `${dia}/${mes}/${anio} ${horas}:${minutos} ${ampm}`;
}

function actualizarContadorAuditoria(total) {
    const el = document.getElementById("auditoriaTotalRegistros");
    if (!el) return;

    const cantidad = Number(total || 0);
    el.textContent = `${cantidad} ${cantidad === 1 ? "registro" : "registros"}`;
}

function formatearAccion(accion) {
    switch (String(accion || "").toUpperCase()) {
        case "INSERTAR":
            return "Insertar";
        case "ACTUALIZAR":
            return "Actualización";
        case "ELIMINAR":
            return "Eliminar";
        case "RECUPERAR":
            return "Recuperar";
        case "LOGIN":
            return "Login";
        case "LOGOUT":
            return "Logout";
        case "LOGIN_FALLIDO":
            return "Login fallido";
        case "LOGIN_BLOQUEADO":
            return "Login bloqueado";
        case "CREAR_PERIODO":
            return "Creación de período";
        case "CAMBIAR_PERIODO":
            return "Cambio de período";
        case "BACKUP":
            return "Backup";
        case "RESTAURAR_BACKUP":
            return "Restaurar backup";
        case "IMPORTAR_EXCEL":
            return "Importar Excel";
        case "MATRICULAR_EXISTENTE":
            return "Matricula existente";
        case "REGISTRAR_ESTUDIANTE":
            return "Registro de estudiante";
        default:
            return String(accion || "")
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
    }
}

function renderEstadoVacio(mensaje = "No hay registros de auditoría para mostrar.") {
    const tablaAuditoria = document.getElementById("tablaAuditoria");
    if (!tablaAuditoria) return;

    actualizarContadorAuditoria(0);

    tablaAuditoria.innerHTML = `
        <tr>
            <td colspan="5" class="historial-vacio">${escapeHTML(mensaje)}</td>
        </tr>
    `;
}

export function renderAuditoria(data) {
    const tablaAuditoria = document.getElementById("tablaAuditoria");
    if (!tablaAuditoria) return;

    if (!Array.isArray(data) || data.length === 0) {
        renderEstadoVacio("No se encontraron registros con los filtros aplicados.");
        return;
    }

    actualizarContadorAuditoria(data.length);

    const filasHtml = data.map(item => {
        const accion = String(item.accion || "").toUpperCase();
        const clase = obtenerClaseAccion(accion);
        const accionMostrada = formatearAccion(accion);

        return `
            <tr>
                <td>${escapeHTML(item.id)}</td>
                <td>${escapeHTML(item.usuario || "—")}</td>
                <td>
                    <span class="${clase}">
                        ${escapeHTML(accionMostrada)}
                    </span>
                </td>
                <td>${escapeHTML(item.descripcion || "")}</td>
                <td>${escapeHTML(formatearFechaAuditoria(item.fecha))}</td>
            </tr>
        `;
    }).join("");

    tablaAuditoria.innerHTML = filasHtml;
}

export function setHistorialAuditoria(data) {
    historialGlobal = Array.isArray(data) ? data : [];
    renderAuditoria(historialGlobal);
}

export function aplicarFiltrosAuditoria() {
    const filtroAccion = document.getElementById("filtroAccion");
    const buscarAuditoria = document.getElementById("buscarAuditoria");

    let data = [...historialGlobal];

    const accion = String(filtroAccion?.value || "").trim().toUpperCase();
    const texto = String(buscarAuditoria?.value || "").toLowerCase().trim();

    if (accion) {
        data = data.filter(e => String(e.accion || "").toUpperCase() === accion);
    }

    if (texto) {
        data = data.filter(e =>
            String(e.descripcion || "").toLowerCase().includes(texto) ||
            String(e.usuario || "").toLowerCase().includes(texto) ||
            String(e.accion || "").toLowerCase().includes(texto) ||
            String(e.fecha || "").toLowerCase().includes(texto)
        );
    }

    renderAuditoria(data);
}

export function initAuditoria() {
    if (auditoriaInicializada) return;
    auditoriaInicializada = true;
    
    const filtroAccion = document.getElementById("filtroAccion");
    const buscarAuditoria = document.getElementById("buscarAuditoria");
    const itemAuditoria = document.querySelector('[data-modulo="auditoria"]');

    filtroAccion?.addEventListener("change", aplicarFiltrosAuditoria);
    buscarAuditoria?.addEventListener("input", aplicarFiltrosAuditoria);

    itemAuditoria?.addEventListener("click", () => {
        window.api.obtenerHistorial();
    });

    window.api.onHistorial((data) => {
        setHistorialAuditoria(data);
    });
}