// service de periodos

const { dbGet, dbAll, dbRun } = require("../../db/helpers");

let periodoActivoCache = null;

function setPeriodoActivoCache(valor) {
    periodoActivoCache = valor ? Number(valor) : null;
}

function clearPeriodoActivoCache() {
    periodoActivoCache = null;
}

async function obtenerPeriodoActivoId() {
    if (periodoActivoCache) {
        return Number(periodoActivoCache);
    }

    const row = await dbGet(
        `SELECT valor FROM configuracion WHERE clave = 'periodo_activo_id'`,
        []
    );

    if (!row || !row.valor) {
        return null;
    }

    periodoActivoCache = Number(row.valor);
    return Number(row.valor);
}

async function fijarPeriodoActivo(periodoId) {
    await dbRun(
        `INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('periodo_activo_id', ?)`,
        [String(periodoId)]
    );

    periodoActivoCache = Number(periodoId);
    return true;
}

async function crearPeriodoSiNoExiste(nombre, fechaInicio, fechaFin, estado = "activo", obtenerFechaLocalSQL) {
    const row = await dbGet(
        `SELECT * FROM periodos_academicos WHERE nombre = ?`,
        [nombre]
    );

    if (row) {
        return row;
    }

    const result = await dbRun(
        `INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, estado, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, fechaInicio, fechaFin, estado, obtenerFechaLocalSQL()]
    );

    return await dbGet(
        `SELECT * FROM periodos_academicos WHERE id = ?`,
        [result.lastID]
    );
}

async function obtenerPeriodoPorId(periodoId) {
    return await dbGet(`
        SELECT *
        FROM periodos_academicos
        WHERE id = ?
    `, [periodoId]);
}

async function obtenerPeriodoActivoCompleto() {
    const periodoId = await obtenerPeriodoActivoId();
    if (!periodoId) return null;

    return await obtenerPeriodoPorId(periodoId);
}

async function cerrarPeriodo(periodoId) {
    await dbRun(`
        UPDATE periodos_academicos
        SET estado = 'cerrado'
        WHERE id = ?
    `, [periodoId]);
}

async function activarPeriodo(periodoId) {
    await dbRun(`
        UPDATE periodos_academicos
        SET estado = 'cerrado'
        WHERE id != ?
    `, [periodoId]);

    await dbRun(`
        UPDATE periodos_academicos
        SET estado = 'activo'
        WHERE id = ?
    `, [periodoId]);

    await fijarPeriodoActivo(periodoId);
}

async function inicializarPeriodosAcademicos(obtenerFechaLocalSQL) {
    const periodoExistenteActivoId = await obtenerPeriodoActivoId();

    if (periodoExistenteActivoId) {
        const periodoActivo = await dbGet(
            `SELECT * FROM periodos_academicos WHERE id = ?`,
            [periodoExistenteActivoId]
        );

        if (periodoActivo) {
            return;
        }
    }

    const periodos = await dbAll(`
        SELECT *
        FROM periodos_academicos
        ORDER BY id ASC
    `);

    if (periodos.length === 0) {
        const periodo2026 = await crearPeriodoSiNoExiste(
            "2026",
            "2026-01-01",
            "2026-12-31",
            "activo",
            obtenerFechaLocalSQL
        );

        await fijarPeriodoActivo(periodo2026.id);
        return;
    }

    const periodoActivoEnTabla = periodos.find(p => p.estado === "activo");

    if (periodoActivoEnTabla) {
        await fijarPeriodoActivo(periodoActivoEnTabla.id);
        return;
    }

    const ultimoPeriodo = periodos[periodos.length - 1];

    await dbRun(`
        UPDATE periodos_academicos
        SET estado = 'activo'
        WHERE id = ?
    `, [ultimoPeriodo.id]);

    await fijarPeriodoActivo(ultimoPeriodo.id);
}

async function obtenerTodosLosPeriodos() {
    return await dbAll(`
        SELECT *
        FROM periodos_academicos
        ORDER BY nombre DESC
    `, []);
}

async function crearPeriodoAcademico(data, obtenerFechaLocalSQL) {
    const nombre = String(data?.nombre || "").trim();
    const fechaInicio = String(data?.fecha_inicio || "").trim();
    const fechaFin = String(data?.fecha_fin || "").trim();

    if (!nombre) {
        return { success: false, message: "El nombre del período es obligatorio." };
    }

    const existente = await dbGet(
        `SELECT id FROM periodos_academicos WHERE nombre = ?`,
        [nombre]
    );

    if (existente) {
        return { success: false, message: "Ese período ya existe." };
    }

    const result = await dbRun(`
        INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, estado, created_at)
        VALUES (?, ?, ?, 'cerrado', ?)
    `, [nombre, fechaInicio || null, fechaFin || null, obtenerFechaLocalSQL()]);

    const nuevoPeriodo = await dbGet(
        `SELECT * FROM periodos_academicos WHERE id = ?`,
        [result.lastID]
    );

    return { success: true, periodo: nuevoPeriodo };
}

module.exports = {
    setPeriodoActivoCache,
    clearPeriodoActivoCache,
    obtenerPeriodoActivoId,
    fijarPeriodoActivo,
    crearPeriodoSiNoExiste,
    obtenerPeriodoPorId,
    obtenerPeriodoActivoCompleto,
    cerrarPeriodo,
    activarPeriodo,
    inicializarPeriodosAcademicos,
    obtenerTodosLosPeriodos,
    crearPeriodoAcademico
};