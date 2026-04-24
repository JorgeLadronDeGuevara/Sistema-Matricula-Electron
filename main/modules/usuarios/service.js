//service de usuarios

const bcrypt = require("bcryptjs");
const { dbAll, dbGet, dbRun } = require("../../db/helpers");

function normalizarTexto(valor = "") {
    return String(valor || "").trim();
}

function normalizarRol(valor = "") {
    const rol = String(valor || "").trim().toLowerCase();
    return rol === "admin" ? "admin" : "usuario";
}

function normalizarActivo(valor) {
    return Number(valor) === 0 ? 0 : 1;
}

function validarUsuario({ usuario, nombre_completo, password, rol }, esEdicion = false) {
    const errores = [];

    if (!normalizarTexto(usuario)) {
        errores.push("El usuario es obligatorio.");
    }

    if (!normalizarTexto(nombre_completo)) {
        errores.push("El nombre completo es obligatorio.");
    }

    if (!esEdicion && !normalizarTexto(password)) {
        errores.push("La contraseña es obligatoria.");
    }

    if (normalizarTexto(password) && normalizarTexto(password).length < 4) {
        errores.push("La contraseña debe tener al menos 4 caracteres.");
    }

    if (!["admin", "usuario"].includes(normalizarRol(rol))) {
        errores.push("El rol no es válido.");
    }

    return errores;
}

async function listarUsuarios() {
    return dbAll(`
        SELECT
            id,
            usuario,
            nombre_completo,
            rol,
            activo,
            created_at,
            updated_at
        FROM usuarios
        ORDER BY id DESC
    `);
}

async function obtenerUsuarioPorUsuario(usuario) {
    return dbGet(
        `SELECT * FROM usuarios WHERE usuario = ?`,
        [normalizarTexto(usuario)]
    );
}

async function obtenerUsuarioPorId(id) {
    return dbGet(
        `SELECT * FROM usuarios WHERE id = ?`,
        [id]
    );
}

async function crearUsuario(datos) {
    const payload = {
        usuario: normalizarTexto(datos.usuario),
        nombre_completo: normalizarTexto(datos.nombre_completo),
        password: String(datos.password || ""),
        rol: normalizarRol(datos.rol),
        activo: normalizarActivo(datos.activo)
    };

    const errores = validarUsuario(payload, false);
    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    const existente = await obtenerUsuarioPorUsuario(payload.usuario);
    if (existente) {
        throw new Error("Ya existe un usuario con ese nombre de usuario.");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const ahora = new Date().toISOString();

    const res = await dbRun(
        `INSERT INTO usuarios (
            usuario,
            password,
            nombre_completo,
            rol,
            activo,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.usuario,
            passwordHash,
            payload.nombre_completo,
            payload.rol,
            payload.activo,
            ahora,
            ahora
        ]
    );

    return {
        id: res.lastID,
        usuario: payload.usuario,
        nombre_completo: payload.nombre_completo,
        rol: payload.rol,
        activo: payload.activo,
        created_at: ahora,
        updated_at: ahora
    };
}

async function actualizarUsuario(id, datos, usuarioActualId = null) {
    const anterior = await obtenerUsuarioPorId(id);
    if (!anterior) {
        throw new Error("No se encontró el usuario.");
    }

    const payload = {
        usuario: datos.usuario !== undefined
            ? normalizarTexto(datos.usuario)
            : anterior.usuario,

        nombre_completo: datos.nombre_completo !== undefined
            ? normalizarTexto(datos.nombre_completo)
            : anterior.nombre_completo,

        rol: datos.rol !== undefined
            ? normalizarRol(datos.rol)
            : anterior.rol,

        activo: normalizarActivo(
            datos.activo !== undefined ? datos.activo : anterior.activo
        )
    };

    const errores = validarUsuario(
        { ...payload, password: "" },
        true
    );

    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    const duplicado = await obtenerUsuarioPorUsuario(payload.usuario);
    if (duplicado && Number(duplicado.id) !== Number(id)) {
        throw new Error("Ya existe un usuario con ese nombre de usuario.");
    }

    if (anterior.rol === "admin" && payload.activo === 0) {
        const adminsActivos = await dbGet(`
            SELECT COUNT(*) AS total
            FROM usuarios
            WHERE rol = 'admin' AND activo = 1
        `);

        if (Number(adminsActivos?.total || 0) <= 1) {
            throw new Error("No se puede desactivar el último administrador.");
        }
    }

    if (usuarioActualId && Number(usuarioActualId) === Number(id) && payload.activo === 0) {
        throw new Error("No puedes desactivar tu propio usuario.");
    }

    if (
        usuarioActualId &&
        Number(usuarioActualId) === Number(id) &&
        anterior.rol === "admin" &&
        payload.rol !== "admin"
    ) {
        throw new Error("No puedes quitarte tu propio rol de administrador.");
    }

    const ahora = new Date().toISOString();

    await dbRun(
        `UPDATE usuarios
         SET usuario = ?, nombre_completo = ?, rol = ?, activo = ?, updated_at = ?
         WHERE id = ?`,
        [
            payload.usuario,
            payload.nombre_completo,
            payload.rol,
            payload.activo,
            ahora,
            id
        ]
    );

    return { id, ...payload, updated_at: ahora };
}

async function cambiarPasswordUsuario(id, nuevaPassword) {
    const usuario = await obtenerUsuarioPorId(id);
    if (!usuario) {
        throw new Error("No se encontró el usuario.");
    }

    const password = String(nuevaPassword || "").trim();
    if (!password || password.length < 4) {
        throw new Error("La nueva contraseña debe tener al menos 4 caracteres.");
    }

    const hash = await bcrypt.hash(password, 10);
    const ahora = new Date().toISOString();

    await dbRun(
        `UPDATE usuarios SET password = ?, updated_at = ? WHERE id = ?`,
        [hash, ahora, id]
    );

    return true;
}

module.exports = {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    cambiarPasswordUsuario,
    obtenerUsuarioPorId,
    obtenerUsuarioPorUsuario
};