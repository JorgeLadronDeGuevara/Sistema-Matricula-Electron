// usuarios.js

let usuariosCache = [];
let usuarioEditandoId = null;

function getRefs() {
    return {
        tablaBody: document.getElementById("tablaUsuariosBody"),
        btnNuevo: document.getElementById("btnNuevoUsuario"),

        modal: document.getElementById("modalUsuario"),
        cerrarModal: document.getElementById("cerrarModalUsuario"),
        btnCancelar: document.getElementById("btnCancelarUsuario"),
        btnGuardar: document.getElementById("btnGuardarUsuario"),

        inputNombre: document.getElementById("nombreCompletoUsuario"),
        inputUsuario: document.getElementById("usernameUsuario"),
        inputPassword: document.getElementById("passwordUsuario"),
        selectRol: document.getElementById("rolUsuario"),
        selectActivo: document.getElementById("activoUsuario"),
        tituloModal: document.getElementById("tituloModalUsuario")
    };
}

function limpiarFormulario() {
    const refs = getRefs();

    refs.inputNombre.value = "";
    refs.inputUsuario.value = "";
    refs.inputPassword.value = "";
    refs.selectRol.value = "usuario";
    refs.selectActivo.value = "1";

    usuarioEditandoId = null;
}

function abrirModal(modo = "crear", usuario = null) {
    const refs = getRefs();

    limpiarFormulario();

    if (modo === "editar" && usuario) {
        usuarioEditandoId = usuario.id;

        refs.tituloModal.textContent = "Editar usuario";
        refs.inputNombre.value = usuario.nombre_completo || "";
        refs.inputUsuario.value = usuario.usuario || "";
        refs.selectRol.value = usuario.rol || "usuario";
        refs.selectActivo.value = String(usuario.activo ?? 1);

        refs.inputPassword.placeholder = "Dejar vacío para no cambiar";
    } else {
        refs.tituloModal.textContent = "Crear usuario";
        refs.inputPassword.placeholder = "Ingrese una contraseña";
    }

    refs.modal.style.display = "flex";
}

function cerrarModal() {
    const refs = getRefs();
    refs.modal.style.display = "none";
}

function escapeHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatearFecha(fecha) {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleString("es-PA");
}

function renderTabla() {
    const { tablaBody } = getRefs();

    if (!tablaBody) return;

    if (usuariosCache.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="7" class="tabla-vacia">
                    No hay usuarios registrados.
                </td>
            </tr>
        `;
        return;
    }

    tablaBody.innerHTML = usuariosCache.map(u => {
        const rolClass = String(u.rol || "").toLowerCase().trim();
        const estadoClass = u.activo === 1 ? "activo" : "inactivo";

        return `
            <tr>
                <td>${escapeHTML(u.id)}</td>
                <td>${escapeHTML(u.usuario)}</td>
                <td>${escapeHTML(u.nombre_completo)}</td>
                <td>
                    <span class="badge-rol ${rolClass}">
                        ${escapeHTML(u.rol)}
                    </span>
                </td>
                <td>
                    <span class="badge-estado ${estadoClass}">
                        ${estadoClass === "activo" ? "Activo" : "Inactivo"}
                    </span>
                </td>
                <td>${escapeHTML(formatearFecha(u.created_at))}</td>
                <td>
                    <button class="btn-accion editar" data-id="${Number(u.id)}">Editar</button>
                </td>
            </tr>
        `;
    }).join("");

    tablaBody.querySelectorAll(".editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            const usuario = usuariosCache.find(u => u.id === id);
            if (usuario) abrirModal("editar", usuario);
        });
    });
}

async function cargarUsuarios() {
    try {
        const res = await window.api.listarUsuarios();

        if (!res?.success) {
            console.error(res?.message);
            return;
        }

        usuariosCache = res.usuarios || [];
        renderTabla();
    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

async function guardarUsuario() {
    const refs = getRefs();

    const datos = {
        nombre_completo: refs.inputNombre.value.trim(),
        usuario: refs.inputUsuario.value.trim(),
        rol: refs.selectRol.value,
        activo: Number(refs.selectActivo.value)
    };

    const password = refs.inputPassword.value.trim();

    if (!usuarioEditandoId) {
        datos.password = password;
    }

    try {
        let res;

        if (usuarioEditandoId) {
            res = await window.api.actualizarUsuario(usuarioEditandoId, datos);

            if (res?.success && password) {
                res = await window.api.cambiarPasswordUsuario(usuarioEditandoId, password);
            }
        } else {
            res = await window.api.crearUsuario(datos);
        }

        if (!res?.success) {
            alert(res?.message || "Error");
            return;
        }

        cerrarModal();
        await cargarUsuarios();

    } catch (error) {
        console.error("Error guardando usuario:", error);
    }
}

export function initUsuarios() {
    const refs = getRefs();

    if (!refs.btnNuevo) return;

    refs.btnNuevo.addEventListener("click", () => abrirModal("crear"));
    refs.cerrarModal?.addEventListener("click", cerrarModal);
    refs.btnCancelar?.addEventListener("click", cerrarModal);
    refs.btnGuardar?.addEventListener("click", guardarUsuario);

    cargarUsuarios();
}