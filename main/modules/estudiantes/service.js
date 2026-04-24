// service de estudiantes

const { getDb } = require("../../db/connection");
const { dbGet, dbAll, dbRun } = require("../../db/helpers");

function generarGrupoFamiliar() {
    return "FAM-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function obtenerFechaActualSQLSimple() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    const segundos = String(ahora.getSeconds()).padStart(2, "0");

    return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

async function obtenerGrupoFamiliarDesdeHermanos(hermanosRelacionados = []) {
    if (!Array.isArray(hermanosRelacionados) || hermanosRelacionados.length === 0) {
        return null;
    }

    const idsValidos = hermanosRelacionados
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0);

    if (idsValidos.length === 0) {
        return null;
    }

    const placeholders = idsValidos.map(() => "?").join(",");

    const rows = await dbAll(
        `SELECT id, grupo_familiar FROM matriculas WHERE id IN (${placeholders})`,
        idsValidos
    );

    const conGrupo = rows.find(r => r.grupo_familiar && String(r.grupo_familiar).trim() !== "");
    return conGrupo ? conGrupo.grupo_familiar : null;
}

async function asignarGrupoFamiliarAHermanos(grupoFamiliar, hermanosRelacionados = []) {
    if (!grupoFamiliar || !Array.isArray(hermanosRelacionados) || hermanosRelacionados.length === 0) {
        return;
    }

    const idsValidos = hermanosRelacionados
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0);

    if (idsValidos.length === 0) {
        return;
    }

    const placeholders = idsValidos.map(() => "?").join(",");
    const fecha = obtenerFechaActualSQLSimple();

    await dbRun(
        `UPDATE matriculas
         SET grupo_familiar = ?, hermano = 'Si', updated_at = ?
         WHERE id IN (${placeholders})`,
        [grupoFamiliar, fecha, ...idsValidos]
    );
}

async function recalcularDescuentoHermanos(grupoFamiliar) {
    try {
        if (!grupoFamiliar) return;

        const rows = await dbAll(
            `
            SELECT id, cti
            FROM matriculas
            WHERE grupo_familiar = ?
              AND estado_matricula = 'activo'
            ORDER BY id ASC
            `,
            [grupoFamiliar]
        );

        if (!rows || rows.length === 0) return;

        const activosNoCTI = rows.filter(est =>
            String(est.cti || "").trim().toLowerCase() !== "si"
        );

        const fecha = obtenerFechaActualSQLSimple();

        if (activosNoCTI.length <= 1) {
            await dbRun(
                `
                UPDATE matriculas
                SET
                    descuento_hermano = 'No',
                    updated_at = ?
                WHERE grupo_familiar = ?
                  AND estado_matricula = 'activo'
                `,
                [fecha, grupoFamiliar]
            );
            return;
        }

        const idQuePagaCompleto = activosNoCTI[0].id;

        await dbRun(
            `
            UPDATE matriculas
            SET
                descuento_hermano = CASE
                    WHEN cti IS NOT NULL AND LOWER(TRIM(cti)) = 'si' THEN 'No'
                    WHEN id = ? THEN 'No'
                    ELSE 'Si'
                END,
                updated_at = ?
            WHERE grupo_familiar = ?
              AND estado_matricula = 'activo'
            `,
            [idQuePagaCompleto, fecha, grupoFamiliar]
        );
    } catch (error) {
        console.error("Error recalculando descuento de hermanos:", error);
        throw error;
    }
}

async function obtenerAlumnoPorCedula(cedula) {
    const cedulaNormalizada = normalizarCedulaImportacion(cedula);

    return await dbGet(`
        SELECT * FROM alumnos
        WHERE cedula = ?
    `, [cedulaNormalizada]);
}

async function crearAlumno(data, obtenerFechaLocalSQL) {
    const fecha = obtenerFechaLocalSQL();
    const cedulaNormalizada = normalizarCedulaImportacion(data.cedula);

    const result = await dbRun(`
        INSERT INTO alumnos (
            cedula,
            apellidos,
            nombres,
            sexo,
            correo,
            estado_alumno,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'activo', ?, ?)
    `, [
        cedulaNormalizada,
        data.apellidos || "",
        data.nombres || "",
        data.sexo || "",
        data.correo || "",
        fecha,
        fecha
    ]);

    return {
        id: result.lastID,
        cedula: cedulaNormalizada,
        apellidos: data.apellidos || "",
        nombres: data.nombres || "",
        sexo: data.sexo || "",
        correo: data.correo || "",
        estado_alumno: "activo",
        created_at: fecha,
        updated_at: fecha
    };
}

async function actualizarAlumno(alumnoId, data, obtenerFechaLocalSQL) {
    const cedulaNormalizada = normalizarCedulaImportacion(data.cedula);

    await dbRun(`
        UPDATE alumnos
        SET
            cedula = ?,
            apellidos = ?,
            nombres = ?,
            sexo = ?,
            correo = ?,
            updated_at = ?
        WHERE id = ?
    `, [
        cedulaNormalizada,
        data.apellidos || "",
        data.nombres || "",
        data.sexo || "",
        data.correo || "",
        obtenerFechaLocalSQL(),
        alumnoId
    ]);
}

async function obtenerAlumnoPorId(alumnoId) {
    return await dbGet(`
        SELECT * FROM alumnos
        WHERE id = ?
    `, [alumnoId]);
}

async function asegurarAlumnoBase(data, obtenerFechaLocalSQL) {
    const dataNormalizada = {
        ...data,
        cedula: normalizarCedulaImportacion(data.cedula)
    };

    let alumno = await obtenerAlumnoPorCedula(dataNormalizada.cedula);

    if (!alumno) {
        return await crearAlumno(dataNormalizada, obtenerFechaLocalSQL);
    }

    await actualizarAlumno(alumno.id, dataNormalizada, obtenerFechaLocalSQL);

    return {
        ...alumno,
        cedula: dataNormalizada.cedula,
        apellidos: dataNormalizada.apellidos || "",
        nombres: dataNormalizada.nombres || "",
        sexo: dataNormalizada.sexo || "",
        correo: dataNormalizada.correo || "",
        updated_at: obtenerFechaLocalSQL()
    };
}

function normalizarSiNoImportacion(valor) {
    const texto = String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (["si", "sí", "s", "yes", "y", "1", "true"].includes(texto)) return "Si";
    if (["no", "n", "0", "false"].includes(texto)) return "No";

    return "";
}

function normalizarSexoImportacion(valor) {
    const texto = String(valor || "").trim().toUpperCase();
    if (texto === "M" || texto === "F") return texto;
    return "";
}

function limpiarTextoImportacion(valor) {
    return String(valor ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);
}

function normalizarCedulaImportacion(valor) {
    let texto = String(valor ?? "")
        .trim()
        .toUpperCase();

    texto = texto.replace(/^'+/, "");
    texto = texto.replace(/[‐-‒–—]/g, "-");
    texto = texto.replace(/\s*-\s*/g, "-");
    texto = texto.replace(/\s+/g, "-");
    texto = texto.replace(/-+/g, "-");
    texto = texto.replace(/^-|-$/g, "");
    texto = texto.replace(/[^A-Z0-9-]/g, "");

    return texto.slice(0, 30);
}

function normalizarTextoBusqueda(texto = "") {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[-°.,/\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarTextoBusquedaCompacto(texto = "") {
    return normalizarTextoBusqueda(texto).replace(/\s+/g, "");
}

function alumnoCoincideBusqueda(alumno, termino) {
    const terminoNormalizado = normalizarTextoBusqueda(termino || "");
    const terminoCompacto = normalizarTextoBusquedaCompacto(termino || "");
    const palabrasBusqueda = terminoNormalizado.split(" ").filter(Boolean);

    if (!terminoCompacto) return true;

    const nombres = alumno.nombres || "";
    const apellidos = alumno.apellidos || "";

    const nombresNormalizados = normalizarTextoBusqueda(nombres);
    const apellidosNormalizados = normalizarTextoBusqueda(apellidos);
    const nombreCompletoNormalizado = normalizarTextoBusqueda(`${nombres} ${apellidos}`);

    const palabrasNombres = nombresNormalizados.split(" ").filter(Boolean);
    const palabrasApellidos = apellidosNormalizados.split(" ").filter(Boolean);

    const cedulaNormalizada = normalizarTextoBusquedaCompacto(alumno.cedula || "");
    const correoNormalizado = normalizarTextoBusqueda(alumno.correo || "");
    const nombreCompletoCompacto = normalizarTextoBusquedaCompacto(nombreCompletoNormalizado);

    const coincideCedula = cedulaNormalizada.includes(terminoCompacto);
    const coincideCorreo = correoNormalizado.includes(terminoNormalizado);
    const coincideFraseCompleta = nombreCompletoCompacto.includes(terminoCompacto);

    const gradoBase =
        alumno.grado ||
        alumno.ultimo_grado ||
        "";

    const gradoNormalizado = normalizarTextoBusqueda(gradoBase);
    const gradoCompacto = normalizarTextoBusquedaCompacto(gradoBase);

    const coincideGrado =
        gradoNormalizado.includes(terminoNormalizado) ||
        gradoCompacto.includes(terminoCompacto);

    const palabraCoincideEnLista = (palabraBuscada, lista) => {
        return lista.some(palabraRegistro =>
            palabraRegistro === palabraBuscada ||
            palabraRegistro.startsWith(palabraBuscada) ||
            palabraBuscada.startsWith(palabraRegistro)
        );
    };

    const todasLasPalabrasExisten = palabrasBusqueda.every(palabra =>
        palabraCoincideEnLista(palabra, [...palabrasNombres, ...palabrasApellidos])
    );

    let coincideNombreApellido = false;

    if (palabrasBusqueda.length === 1) {
        coincideNombreApellido =
            palabraCoincideEnLista(palabrasBusqueda[0], palabrasNombres) ||
            palabraCoincideEnLista(palabrasBusqueda[0], palabrasApellidos);
    } else {
        const coincideAlMenosUnNombre = palabrasBusqueda.some(palabra =>
            palabraCoincideEnLista(palabra, palabrasNombres)
        );

        const coincideAlMenosUnApellido = palabrasBusqueda.some(palabra =>
            palabraCoincideEnLista(palabra, palabrasApellidos)
        );

        coincideNombreApellido =
            todasLasPalabrasExisten &&
            coincideAlMenosUnNombre &&
            coincideAlMenosUnApellido;
    }

    return (
        coincideCedula ||
        coincideCorreo ||
        coincideGrado ||
        coincideFraseCompleta ||
        coincideNombreApellido
    );
}

function filtrarAlumnosPorTermino(lista, termino) {
    if (!Array.isArray(lista)) return [];
    return lista.filter(alumno => alumnoCoincideBusqueda(alumno, termino));
}

function validarFilaImportacion(fila) {
    const cedulaRegex = /^[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,10})*$/;
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cedulaRegex.test(fila.cedula || "")) {
        return "Cédula inválida";
    }

    if (!fila.nombres || fila.nombres.length < 2) {
        return "Nombre inválido";
    }

    if (!fila.apellidos || fila.apellidos.length < 2) {
        return "Apellido inválido";
    }

    if (!fila.grado || fila.grado.length < 1) {
        return "Grado inválido";
    }

    if (fila.correo && !correoRegex.test(fila.correo)) {
        return "Correo inválido";
    }

    if (fila.sexo && !["M", "F"].includes(fila.sexo)) {
        return "Sexo inválido";
    }

    return null;
}

function sugerirSiguienteGrado(gradoActual = "") {
    const texto = String(gradoActual || "").trim();
    const match = texto.match(/^(\d{1,2})/);

    if (!match) return "";

    const numero = Number(match[1]);

    if (!Number.isInteger(numero)) return "";
    if (numero >= 7 && numero < 12) return String(numero + 1);
    if (numero === 12) return "Egresado";

    return "";
}

async function buscarAlumnosGlobales(termino = "") {
    const alumnos = await dbAll(`
        SELECT
            a.id,
            a.cedula,
            a.apellidos,
            a.nombres,
            a.sexo,
            a.correo,
            lm.grado AS ultimo_grado,
            p.nombre AS ultimo_periodo,
            lm.cti AS ultimo_cti,
            lm.hermano AS ultimo_hermano
        FROM alumnos a
        LEFT JOIN (
            SELECT m1.*
            FROM matriculas m1
            INNER JOIN (
                SELECT alumno_id, MAX(id) AS max_id
                FROM matriculas
                GROUP BY alumno_id
            ) ult ON ult.alumno_id = m1.alumno_id AND ult.max_id = m1.id
        ) lm ON lm.alumno_id = a.id
        LEFT JOIN periodos_academicos p ON p.id = lm.periodo_id
        ORDER BY a.nombres ASC, a.apellidos ASC
    `);

    const resultados = filtrarAlumnosPorTermino(alumnos, termino).slice(0, 30);

    return resultados.map(alumno => ({
        ...alumno,
        ultimo_grado: alumno.ultimo_grado || "",
        ultimo_periodo: alumno.ultimo_periodo || "",
        ultimo_cti: alumno.ultimo_cti || "",
        ultimo_hermano: alumno.ultimo_hermano || "",
        grado_sugerido: sugerirSiguienteGrado(alumno.ultimo_grado)
    }));
}

module.exports = {
    generarGrupoFamiliar,
    obtenerGrupoFamiliarDesdeHermanos,
    asignarGrupoFamiliarAHermanos,
    recalcularDescuentoHermanos,
    obtenerAlumnoPorCedula,
    crearAlumno,
    actualizarAlumno,
    obtenerAlumnoPorId,
    asegurarAlumnoBase,
    normalizarSiNoImportacion,
    normalizarSexoImportacion,
    limpiarTextoImportacion,
    normalizarCedulaImportacion,
    validarFilaImportacion,
    sugerirSiguienteGrado,
    normalizarTextoBusqueda,
    normalizarTextoBusquedaCompacto,
    alumnoCoincideBusqueda,
    filtrarAlumnosPorTermino,
    buscarAlumnosGlobales
};