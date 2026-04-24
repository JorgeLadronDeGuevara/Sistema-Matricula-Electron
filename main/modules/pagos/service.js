// service de pagos

const { dbGet, dbAll, dbRun } = require("../../db/helpers");

function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function normalizarMonto(valor) {
    const numero = Number(valor || 0);
    if (!Number.isFinite(numero) || numero < 0) {
        return 0;
    }
    return Number(numero.toFixed(2));
}

function validarMatriculaPago(matricula) {
    if (!esObjeto(matricula)) {
        throw new Error("Matrícula inválida.");
    }

    if (!Number.isInteger(Number(matricula.id)) || Number(matricula.id) <= 0) {
        throw new Error("ID de matrícula inválido.");
    }

    if (!Number.isInteger(Number(matricula.alumno_id)) || Number(matricula.alumno_id) <= 0) {
        throw new Error("ID de alumno inválido.");
    }

    return true;
}

function normalizarDetallePago(detallePago) {
    if (!esObjeto(detallePago)) {
        throw new Error("Detalle de pago inválido.");
    }

    return {
        donacion: normalizarMonto(detallePago.donacion),
        informatica: normalizarMonto(detallePago.informatica),
        carnet: normalizarMonto(detallePago.carnet),
        odontologia: normalizarMonto(detallePago.odontologia),
        seguro: normalizarMonto(detallePago.seguro)
    };
}

function validarNumeroComprobante(numeroComprobante) {
    const numero = String(numeroComprobante || "").trim();
    if (!/^CP-\d{6,}$/.test(numero)) {
        throw new Error("Número de comprobante inválido.");
    }
    return numero;
}

function normalizarUsuarioActual(usuarioActual) {
    if (typeof usuarioActual === "string") {
        return usuarioActual.trim() || "desconocido";
    }

    if (usuarioActual && typeof usuarioActual === "object") {
        return String(usuarioActual.usuario || usuarioActual.username || "desconocido").trim() || "desconocido";
    }

    return "desconocido";
}

async function registrarHistorialPago({
    matricula,
    detallePago,
    numeroComprobante = "",
    fechaRegistro = "",
    usuarioActual = "desconocido",
    obtenerFechaLocalSQL,
    dbRunOverride
}) {
    validarMatriculaPago(matricula);
    const detalle = normalizarDetallePago(detallePago);

    const ejecutar = dbRunOverride || dbRun;

    const fecha = fechaRegistro || obtenerFechaLocalSQL();
    const numero = numeroComprobante ? validarNumeroComprobante(numeroComprobante) : "";

    const montoMatricula =
        detalle.donacion +
        detalle.informatica +
        detalle.carnet +
        detalle.odontologia;

    const total = montoMatricula + detalle.seguro;

    await ejecutar(`
        INSERT INTO historial_pagos (
            matricula_id,
            alumno_id,
            cedula,
            nombres,
            apellidos,
            grado,
            numero_comprobante,
            monto_donacion,
            monto_informatica,
            monto_carnet,
            monto_odontologia,
            monto_seguro,
            monto_matricula,
            monto_total,
            usuario,
            fecha
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        Number(matricula.id),
        Number(matricula.alumno_id),
        matricula.cedula || "",
        matricula.nombres || "",
        matricula.apellidos || "",
        matricula.grado || "",
        numero,
        detalle.donacion,
        detalle.informatica,
        detalle.carnet,
        detalle.odontologia,
        detalle.seguro,
        montoMatricula,
        total,
        normalizarUsuarioActual(usuarioActual),
        fecha
    ]);
}

function generarNumeroComprobante(id) {
    return "CP-" + String(id).padStart(6, "0");
}

async function registrarComprobantePago({
    matricula,
    detallePago,
    usuarioActual = "desconocido",
    obtenerFechaLocalSQL,
    dbRunOverride,
    dbGetOverride
}) {
    validarMatriculaPago(matricula);
    const detalle = normalizarDetallePago(detallePago);

    const ejecutarRun = dbRunOverride || dbRun;
    const ejecutarGet = dbGetOverride || dbGet;

    const fecha = obtenerFechaLocalSQL();

    const montoMatricula =
        detalle.donacion +
        detalle.informatica +
        detalle.carnet +
        detalle.odontologia;

    const total = montoMatricula + detalle.seguro;

    const result = await ejecutarRun(`
        INSERT INTO comprobantes_pago (
            numero_comprobante,
            matricula_id,
            alumno_id,
            cedula,
            nombres,
            apellidos,
            grado,
            monto_donacion,
            monto_informatica,
            monto_carnet,
            monto_odontologia,
            monto_seguro,
            monto_matricula,
            monto_total,
            usuario,
            fecha
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        null,
        Number(matricula.id),
        Number(matricula.alumno_id),
        matricula.cedula || "",
        matricula.nombres || "",
        matricula.apellidos || "",
        matricula.grado || "",
        detalle.donacion,
        detalle.informatica,
        detalle.carnet,
        detalle.odontologia,
        detalle.seguro,
        montoMatricula,
        total,
        normalizarUsuarioActual(usuarioActual),
        fecha
    ]);

    const idComprobante = result.lastID;
    const numero = generarNumeroComprobante(idComprobante);

    await ejecutarRun(`
        UPDATE comprobantes_pago
        SET numero_comprobante = ?
        WHERE id = ?
    `, [numero, idComprobante]);

    const row = await ejecutarGet(`
        SELECT * FROM comprobantes_pago
        WHERE id = ?
    `, [idComprobante]);

    if (!row) {
        throw new Error("No se encontró el comprobante generado.");
    }

    return {
        ...row,
        detalle: [
            { concepto: "Donación", monto: Number(row.monto_donacion || 0) },
            { concepto: "Informática", monto: Number(row.monto_informatica || 0) },
            { concepto: "Carnet", monto: Number(row.monto_carnet || 0) },
            { concepto: "Odontología", monto: Number(row.monto_odontologia || 0) },
            { concepto: "Seguro", monto: Number(row.monto_seguro || 0) }
        ].filter(item => item.monto > 0)
    };
}

async function obtenerHistorialPagosPorMatricula(matriculaId) {
    const id = Number(matriculaId);

    if (!Number.isInteger(id) || id <= 0) {
        return [];
    }

    return await dbAll(`
        SELECT 
            hp.id,
            hp.matricula_id,
            hp.alumno_id,
            hp.cedula,
            hp.nombres,
            hp.apellidos,
            hp.grado,
            hp.numero_comprobante,
            hp.monto_donacion,
            hp.monto_informatica,
            hp.monto_carnet,
            hp.monto_odontologia,
            hp.monto_seguro,
            hp.monto_matricula,
            hp.monto_total,
            hp.usuario,
            hp.fecha,
            cp.id AS comprobante_id
        FROM historial_pagos hp
        LEFT JOIN comprobantes_pago cp
            ON cp.numero_comprobante = hp.numero_comprobante
        WHERE hp.matricula_id = ?
        ORDER BY hp.id DESC
    `, [id]);
}

async function obtenerComprobantePorNumero(numeroComprobante) {
    const numero = validarNumeroComprobante(numeroComprobante);

    const row = await dbGet(`
        SELECT *
        FROM comprobantes_pago
        WHERE numero_comprobante = ?
    `, [numero]);

    if (!row) {
        throw new Error("No se encontró el comprobante.");
    }

    return {
        ...row,
        detalle: [
            { concepto: "Donación", monto: Number(row.monto_donacion || 0) },
            { concepto: "Informática", monto: Number(row.monto_informatica || 0) },
            { concepto: "Carnet", monto: Number(row.monto_carnet || 0) },
            { concepto: "Odontología", monto: Number(row.monto_odontologia || 0) },
            { concepto: "Seguro", monto: Number(row.monto_seguro || 0) }
        ].filter(item => item.monto > 0)
    };
}

module.exports = {
    registrarHistorialPago,
    generarNumeroComprobante,
    registrarComprobantePago,
    obtenerHistorialPagosPorMatricula,
    obtenerComprobantePorNumero
};