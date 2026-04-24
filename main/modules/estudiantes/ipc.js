// ipc de estudiantes

const { dbGet, dbAll, dbRun, runInTransaction } = require("../../db/helpers");

const {
    obtenerPeriodoActivoId,
    obtenerPeriodoActivoCompleto
} = require("../periodos/service");

const {
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
    buscarAlumnosGlobales,
    filtrarAlumnosPorTermino
} = require("./service");



function normalizarSiNoSeguro(valor) {
    const texto = String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (texto === "si") return "Si";
    if (texto === "no") return "No";
    return "";
}

function sanitizarIdsRelacionados(lista) {
    if (!Array.isArray(lista)) return [];

    return [
        ...new Set(
            lista
                .map(Number)
                .filter(id => Number.isInteger(id) && id > 0)
        )
    ];
}

function validarLoteImportacion(lista, maximo = 2000) {
    return Array.isArray(lista) && lista.length > 0 && lista.length <= maximo;
}

function esIdValido(id) {
    return Number.isInteger(id) && id > 0;
}

function registerEstudiantesIpc(ipcMain, deps = {}) {
    const {
        obtenerFechaLocalSQL,
        registrarHistorial,
        registrarHistorialPago,
        registrarComprobantePago,
        getUsuarioActual
    } = deps;

    ipcMain.on("insertar-estudiante", async (event, est) => {
        try {
            if (!est || typeof est !== "object") {
                event.reply("error-insertar", "Objeto estudiante inválido");
                return;
            }

           const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const documentoRegex = /^[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,10})*$/;

            est.cedula = normalizarCedulaImportacion(est.cedula);

            if (!documentoRegex.test(est.cedula)) {
                event.reply("error-insertar", "Cédula inválida");
                return;
            }

            if (typeof est.nombres !== "string" || est.nombres.trim().length < 2) {
                event.reply("error-insertar", "Nombre inválido");
                return;
            }

            if (typeof est.apellidos !== "string" || est.apellidos.trim().length < 2) {
                event.reply("error-insertar", "Apellido inválido");
                return;
            }

            if (est.correo && !correoRegex.test(est.correo)) {
                event.reply("error-insertar", "Correo inválido");
                return;
            }

            if (typeof est.grado !== "string" || est.grado.trim().length < 1) {
                event.reply("error-insertar", "Grado inválido");
                return;
            }

            if (est.sexo && !["M", "F"].includes(est.sexo)) {
                event.reply("error-insertar", "Sexo inválido");
                return;
            }

            est.cti = normalizarSiNoSeguro(est.cti);
            est.hermano = normalizarSiNoSeguro(est.hermano);

            const hermanosRelacionados = sanitizarIdsRelacionados(est.hermanosRelacionados);

            if (est.hermano === "Si" && hermanosRelacionados.length === 0) {
                event.reply("error-insertar", "Debe seleccionar al menos un hermano.");
                return;
            }

            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                event.reply("error-insertar", "No hay un período académico activo.");
                return;
            }

            const periodoActivo = await obtenerPeriodoActivoCompleto();

            if (!periodoActivo) {
                event.reply("error-insertar", "No hay un período académico activo.");
                return;
            }

            if (periodoActivo.estado !== "activo") {
                event.reply("error-insertar", "No se pueden crear matrículas en un período cerrado.");
                return;
            }

            const alumno = await asegurarAlumnoBase(est, obtenerFechaLocalSQL);

            const matriculaExistente = await dbGet(`
                SELECT id
                FROM matriculas
                WHERE alumno_id = ? AND periodo_id = ?
            `, [alumno.id, periodoId]);

            if (matriculaExistente) {
                event.reply("error-insertar", "Ese alumno ya tiene matrícula en el período activo.");
                return;
            }

            const grupoExistente = await obtenerGrupoFamiliarDesdeHermanos(hermanosRelacionados);

            const grupoFamiliarFinal =
                est.hermano === "Si" && hermanosRelacionados.length > 0
                    ? (grupoExistente || generarGrupoFamiliar())
                    : null;

            const fechaActual = obtenerFechaLocalSQL();

            const resultado = await dbRun(`
                INSERT INTO matriculas (
                    alumno_id,
                    periodo_id,
                    grado,
                    cti,
                    hermano,
                    grupo_familiar,
                    descuento_hermano,
                    pagado,
                    seguro,
                    pagado_donacion,
                    pagado_informatica,
                    pagado_carnet,
                    pagado_odontologia,
                    pagado_seguro,
                    estado_pago,
                    estado_matricula,
                    promocion,
                    observaciones,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                alumno.id,
                periodoId,
                est.grado,
                est.cti || "",
                est.hermano || "",
                grupoFamiliarFinal,
                "No",
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                "Pendiente",
                "activo",
                "pendiente",
                "",
                fechaActual,
                fechaActual
            ]);

            await asignarGrupoFamiliarAHermanos(grupoFamiliarFinal, hermanosRelacionados);
            await recalcularDescuentoHermanos(grupoFamiliarFinal);

            await registrarHistorial?.(
                "REGISTRAR_ESTUDIANTE",
                `Registró al estudiante ${alumno.nombres} ${alumno.apellidos} en el período ${periodoActivo.nombre} con grado ${est.grado}${est.cti === "Si" ? ", CTI" : ""}${est.hermano === "Si" ? ", con hermanos asociados" : ""}`
            );

            event.reply("estudiante-insertado", resultado.lastID);
        } catch (error) {
            console.error("Error al insertar estudiante:", error);
            event.reply("error-insertar", "Error al insertar estudiante");
        }
    });

    ipcMain.on("actualizar-estudiante", async (event, est) => {
        try {
            if (!est || typeof est !== "object") {
                event.reply("error-insertar", "Objeto estudiante inválido al actualizar");
                return;
            }

            const idMatricula = Number(est.id);
            if (!esIdValido(idMatricula)) {
                event.reply("error-insertar", "ID inválido al actualizar matrícula");
                return;
            }

            est.cti = normalizarSiNoSeguro(est.cti);
            est.hermano = normalizarSiNoSeguro(est.hermano);

            const anterior = await dbGet(`
                SELECT
                    m.*,
                    a.cedula,
                    a.nombres,
                    a.apellidos,
                    a.sexo,
                    a.correo
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.id = ?
            `, [idMatricula]);

            if (!anterior) {
                event.reply("error-insertar", "No se encontró la matrícula a actualizar");
                return;
            }

            const gradoFinal = est.grado || anterior.grado || "";
            const ctiFinal = est.cti || anterior.cti || "";
            const hermanoFinal = est.hermano || anterior.hermano || "";
            const correoFinal =
                est.correo !== undefined ? (est.correo || "") : (anterior.correo || "");
            const estadoPagoFinal = est.estado_pago || anterior.estado_pago || "Pendiente";

            const pagadoDonacion =
                est.pagado_donacion !== undefined
                    ? Number(est.pagado_donacion || 0)
                    : Number(anterior.pagado_donacion || 0);

            const pagadoInformatica =
                est.pagado_informatica !== undefined
                    ? Number(est.pagado_informatica || 0)
                    : Number(anterior.pagado_informatica || 0);

            const pagadoCarnet =
                est.pagado_carnet !== undefined
                    ? Number(est.pagado_carnet || 0)
                    : Number(anterior.pagado_carnet || 0);

            const pagadoOdontologia =
                est.pagado_odontologia !== undefined
                    ? Number(est.pagado_odontologia || 0)
                    : Number(anterior.pagado_odontologia || 0);

            const pagadoSeguro =
                est.pagado_seguro !== undefined
                    ? Number(est.pagado_seguro || 0)
                    : Number(anterior.pagado_seguro || 0);

            const pagado =
                pagadoDonacion +
                pagadoInformatica +
                pagadoCarnet +
                pagadoOdontologia;

            const seguro = pagadoSeguro;

            if (
                [pagado, seguro, pagadoDonacion, pagadoInformatica, pagadoCarnet, pagadoOdontologia, pagadoSeguro]
                    .some(v => Number.isNaN(v) || v < 0)
            ) {
                event.reply("error-insertar", "Hay montos inválidos en la actualización.");
                return;
            }

            await actualizarAlumno(
                anterior.alumno_id,
                {
                    cedula: est.cedula || anterior.cedula,
                    nombres: est.nombres || anterior.nombres,
                    apellidos: est.apellidos || anterior.apellidos,
                    sexo: est.sexo || anterior.sexo,
                    correo: correoFinal
                },
                obtenerFechaLocalSQL
            );

            const hermanosRelacionados = sanitizarIdsRelacionados(est.hermanosRelacionados);

            if (hermanoFinal === "Si" && !anterior.grupo_familiar && hermanosRelacionados.length === 0) {
                event.reply("error-insertar", "Debe seleccionar al menos un hermano.");
                return;
            }

            const grupoExistente = await obtenerGrupoFamiliarDesdeHermanos(hermanosRelacionados);

            let grupoFamiliarFinal = null;

            if (hermanoFinal === "Si") {
                if (hermanosRelacionados.length > 0) {
                    grupoFamiliarFinal =
                        grupoExistente || anterior.grupo_familiar || generarGrupoFamiliar();
                } else {
                    grupoFamiliarFinal = anterior.grupo_familiar || null;
                }
            }

            const descuentoNuevo = hermanoFinal === "Si"
                ? (normalizarSiNoSeguro(
                    est.descuento_hermano ||
                    est.descuentoHermano ||
                    anterior.descuento_hermano ||
                    "No"
                ) || "No")
                : "No";

            await dbRun(`
                UPDATE matriculas
                SET
                    grado = ?,
                    cti = ?,
                    hermano = ?,
                    grupo_familiar = ?,
                    descuento_hermano = ?,
                    pagado = ?,
                    seguro = ?,
                    pagado_donacion = ?,
                    pagado_informatica = ?,
                    pagado_carnet = ?,
                    pagado_odontologia = ?,
                    pagado_seguro = ?,
                    estado_pago = ?,
                    updated_at = ?
                WHERE id = ?
            `, [
                    gradoFinal,
                    ctiFinal,
                    hermanoFinal,
                    grupoFamiliarFinal,
                    descuentoNuevo,
                    pagado,
                    seguro,
                    pagadoDonacion,
                    pagadoInformatica,
                    pagadoCarnet,
                    pagadoOdontologia,
                    pagadoSeguro,
                    estadoPagoFinal,
                    obtenerFechaLocalSQL(),
                    idMatricula
                ]);

            await asignarGrupoFamiliarAHermanos(grupoFamiliarFinal, hermanosRelacionados);

            if (anterior.grupo_familiar && anterior.grupo_familiar !== grupoFamiliarFinal) {
                await recalcularDescuentoHermanos(anterior.grupo_familiar);
            }

            if (grupoFamiliarFinal) {
                await recalcularDescuentoHermanos(grupoFamiliarFinal);
            }

            const cambios = [];

            const gradoAnteriorNormalizado = String(anterior.grado || "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "")
                .replace(/-/g, "");

            const gradoNuevoNormalizado = String(gradoFinal || "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "")
                .replace(/-/g, "");

            if (gradoAnteriorNormalizado !== gradoNuevoNormalizado) {
                cambios.push(`grado de ${anterior.grado} a ${est.grado}`);
            }

            if (Number(anterior.pagado_donacion || 0) !== pagadoDonacion) {
                cambios.push(`donación de $${Number(anterior.pagado_donacion || 0)} a $${pagadoDonacion}`);
            }

            if (Number(anterior.pagado_informatica || 0) !== pagadoInformatica) {
                cambios.push(`informática de $${Number(anterior.pagado_informatica || 0)} a $${pagadoInformatica}`);
            }

            if (Number(anterior.pagado_carnet || 0) !== pagadoCarnet) {
                cambios.push(`carnet de $${Number(anterior.pagado_carnet || 0)} a $${pagadoCarnet}`);
            }

            if (Number(anterior.pagado_odontologia || 0) !== pagadoOdontologia) {
                cambios.push(`odontología de $${Number(anterior.pagado_odontologia || 0)} a $${pagadoOdontologia}`);
            }

            if (Number(anterior.pagado_seguro || 0) !== pagadoSeguro) {
                cambios.push(`seguro de $${Number(anterior.pagado_seguro || 0)} a $${pagadoSeguro}`);
            }

            if ((anterior.correo || "") !== correoFinal) {
                cambios.push(`correo de ${anterior.correo || ""} a ${correoFinal}`);
            }

            if ((anterior.cti || "") !== ctiFinal) {
                cambios.push(`CTI de ${anterior.cti || ""} a ${ctiFinal}`);
            }

            if ((anterior.hermano || "") !== hermanoFinal) {
                cambios.push(`hermano de ${anterior.hermano || ""} a ${hermanoFinal}`);
            }

            if ((anterior.grupo_familiar || "") !== (grupoFamiliarFinal || "")) {
                cambios.push(
                    `grupo familiar de ${anterior.grupo_familiar || "ninguno"} a ${grupoFamiliarFinal || "ninguno"}`
                );
            }

            if ((anterior.descuento_hermano || "No") !== descuentoNuevo) {
                cambios.push(
                    `descuento hermano de ${anterior.descuento_hermano || "No"} a ${descuentoNuevo}`
                );
            }


            const matriculaPago = {
                id: idMatricula,
                alumno_id: anterior.alumno_id,
                cedula: anterior.cedula,
                nombres: anterior.nombres,
                apellidos: anterior.apellidos,
                grado: gradoFinal
            };

            const detallePagoActual = {
                donacion: Number(est.pago_donacion_actual || 0),
                informatica: Number(est.pago_informatica_actual || 0),
                carnet: Number(est.pago_carnet_actual || 0),
                odontologia: Number(est.pago_odontologia_actual || 0),
                seguro: Number(est.pago_seguro_actual || 0)
            };

            const totalPagoActual =
                detallePagoActual.donacion +
                detallePagoActual.informatica +
                detallePagoActual.carnet +
                detallePagoActual.odontologia +
                detallePagoActual.seguro;

            const huboPagoActual = totalPagoActual > 0;

            let descripcion = huboPagoActual
                ? `Registró pago a ${anterior.nombres} ${anterior.apellidos}`
                : `Editó la matrícula de ${anterior.nombres} ${anterior.apellidos}`;

            if (cambios.length > 0) {
                descripcion += ` y cambió: ${cambios.join(", ")}`;
            }

            const usuarioActual = typeof getUsuarioActual === "function"
                ? getUsuarioActual()
                : "desconocido";

            if (totalPagoActual > 0) {
                try {
                    const comprobante = await runInTransaction(async ({ dbRun, dbGet }) => {
                        const comprobanteGenerado = await registrarComprobantePago?.({
                            matricula: matriculaPago,
                            detallePago: detallePagoActual,
                            usuarioActual,
                            obtenerFechaLocalSQL,
                            dbRunOverride: dbRun,
                            dbGetOverride: dbGet
                        });

                        await registrarHistorialPago?.({
                            matricula: matriculaPago,
                            detallePago: detallePagoActual,
                            numeroComprobante: comprobanteGenerado.numero_comprobante,
                            fechaRegistro: comprobanteGenerado.fecha,
                            usuarioActual,
                            obtenerFechaLocalSQL,
                            dbRunOverride: dbRun
                        });

                        return comprobanteGenerado;
                    });

                    await registrarHistorial?.(
                        huboPagoActual ? "REGISTRAR_PAGO" : "ACTUALIZAR",
                        descripcion
                    );
                    event.reply("estudiante-actualizado");
                    event.reply("comprobante-generado", comprobante);
                } catch (errorComprobante) {
                    console.error("Error generando comprobante:", errorComprobante);
                    await registrarHistorial?.(
                        huboPagoActual ? "REGISTRAR_PAGO" : "ACTUALIZAR",
                        descripcion
                    );
                    event.reply("estudiante-actualizado");
                }
            } else {
                await registrarHistorial?.(
                    huboPagoActual ? "REGISTRAR_PAGO" : "ACTUALIZAR",
                    descripcion
                );
                event.reply("estudiante-actualizado");
            }
        } catch (error) {
            console.error("Error actualizando matrícula:", error);
            event.reply("error-insertar", "Error al actualizar estudiante");
        }
    });

    ipcMain.on("insertar-muchos-estudiantes", async (event, lista) => {
        if (!validarLoteImportacion(lista)) {
            event.reply("error-insertar", "No hay datos válidos para importar o el lote es demasiado grande.");
            return;
        }

        try {
            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                event.reply("error-insertar", "No hay un período académico activo.");
                return;
            }

            const periodoActivo = await obtenerPeriodoActivoCompleto();

            if (!periodoActivo) {
                event.reply("error-insertar", "No hay un período académico activo.");
                return;
            }

            if (periodoActivo.estado !== "activo") {
                event.reply("error-insertar", "No se puede importar matrícula en un período cerrado.");
                return;
            }

            const resumen = {
                totalFilas: lista.length,
                alumnosNuevos: 0,
                alumnosActualizados: 0,
                matriculasCreadas: 0,
                omitidos: 0,
                errores: []
            };

            await dbRun("BEGIN TRANSACTION");

            for (let i = 0; i < lista.length; i++) {
                const filaOriginal = lista[i];

                try {
                    const fila = {
                        cedula: normalizarCedulaImportacion(filaOriginal.cedula),
                        apellidos: limpiarTextoImportacion(filaOriginal.apellidos),
                        nombres: limpiarTextoImportacion(filaOriginal.nombres),
                        sexo: normalizarSexoImportacion(filaOriginal.sexo),
                        correo: limpiarTextoImportacion(filaOriginal.correo),
                        grado: limpiarTextoImportacion(filaOriginal.grado),
                        cti: normalizarSiNoImportacion(filaOriginal.cti),
                        hermano: normalizarSiNoImportacion(filaOriginal.hermano)
                    };

                    const errorValidacion = validarFilaImportacion(fila);

                    if (errorValidacion) {
                        resumen.errores.push(`Fila ${i + 2}: ${errorValidacion} (${fila.cedula || "sin cédula"})`);
                        continue;
                    }

                    const alumnoExistente = await obtenerAlumnoPorCedula(fila.cedula);

                    let alumno;

                    if (!alumnoExistente) {
                        alumno = await crearAlumno(fila, obtenerFechaLocalSQL);
                        resumen.alumnosNuevos++;
                    } else {
                        await actualizarAlumno(alumnoExistente.id, fila, obtenerFechaLocalSQL);
                        alumno = await obtenerAlumnoPorId(alumnoExistente.id);
                        resumen.alumnosActualizados++;
                    }

                    const matriculaExistente = await dbGet(`
                        SELECT id
                        FROM matriculas
                        WHERE alumno_id = ? AND periodo_id = ?
                    `, [alumno.id, periodoId]);

                    if (matriculaExistente) {
                        resumen.omitidos++;
                        continue;
                    }

                    const estadoPago = "Pendiente";
                    const fecha = obtenerFechaLocalSQL();

                    await dbRun(`
                        INSERT INTO matriculas (
                            alumno_id,
                            periodo_id,
                            grado,
                            cti,
                            hermano,
                            grupo_familiar,
                            descuento_hermano,
                            pagado,
                            seguro,
                            pagado_donacion,
                            pagado_informatica,
                            pagado_carnet,
                            pagado_odontologia,
                            pagado_seguro,
                            estado_pago,
                            estado_matricula,
                            promocion,
                            observaciones,
                            created_at,
                            updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        alumno.id,
                        periodoId,
                        fila.grado,
                        fila.cti || "",
                        fila.hermano || "",
                        null,
                        "No",
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        estadoPago,
                        "activo",
                        "pendiente",
                        "",
                        fecha,
                        fecha
                    ]);

                    resumen.matriculasCreadas++;
                } catch (errorFila) {
                    console.error(`Error importando fila ${i + 2}:`, errorFila);
                    resumen.errores.push(`Fila ${i + 2}: ${errorFila.message || "Error desconocido"}`);
                }
            }

            await dbRun("COMMIT");

            await registrarHistorial?.(
                "IMPORTAR_EXCEL",
                `Importó estudiantes desde Excel en el período ${periodoActivo.nombre}. Nuevos: ${resumen.alumnosNuevos}, actualizados: ${resumen.alumnosActualizados}, matrículas creadas: ${resumen.matriculasCreadas}, omitidos: ${resumen.omitidos}, errores: ${resumen.errores.length}`
            );

            event.reply("estudiantes-insertados", resumen);
        } catch (error) {
            console.error("Error en importación masiva:", error);

            try {
                await dbRun("ROLLBACK");
            } catch (rollbackError) {
                console.error("Error haciendo rollback:", rollbackError);
            }

            event.reply("error-insertar", "Ocurrió un error al importar el Excel.");
        }
    });

    ipcMain.on("traer-estudiantes", async (event) => {
        try {
            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                event.reply("resultados-busqueda", []);
                return;
            }

            const rows = await dbAll(`
                SELECT
                    m.id,
                    m.alumno_id,
                    m.periodo_id,
                    a.cedula,
                    a.apellidos,
                    a.nombres,
                    a.sexo,
                    a.correo,
                    m.pagado,
                    m.seguro,
                    m.pagado_donacion,
                    m.pagado_informatica,
                    m.pagado_carnet,
                    m.pagado_odontologia,
                    m.pagado_seguro,
                    m.grado,
                    m.cti,
                    m.hermano,
                    m.grupo_familiar,
                    m.descuento_hermano,
                    m.estado_pago,
                    m.estado_matricula AS estado_estudiante,
                    m.promocion,
                    m.observaciones
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.estado_matricula = 'activo'
                  AND m.periodo_id = ?
                ORDER BY m.id ASC
            `, [periodoId]);

            event.reply("resultados-busqueda", rows);
        } catch (error) {
            console.error("Error obteniendo período activo en traer-estudiantes:", error);
            event.reply("resultados-busqueda", []);
        }
    });

    ipcMain.on("buscar-estudiantes", async (event, termino) => {
        try {
            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                event.reply("resultados-busqueda", []);
                return;
            }

            const rows = await dbAll(`
                SELECT
                    m.id,
                    m.alumno_id,
                    m.periodo_id,
                    a.cedula,
                    a.apellidos,
                    a.nombres,
                    a.sexo,
                    a.correo,
                    m.pagado,
                    m.seguro,
                    m.pagado_donacion,
                    m.pagado_informatica,
                    m.pagado_carnet,
                    m.pagado_odontologia,
                    m.pagado_seguro,
                    m.grado,
                    m.cti,
                    m.hermano,
                    m.grupo_familiar,
                    m.descuento_hermano,
                    m.estado_pago,
                    m.estado_matricula AS estado_estudiante,
                    m.promocion,
                    m.observaciones
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.estado_matricula = 'activo'
                AND m.periodo_id = ?
                ORDER BY m.id ASC
            `, [periodoId]);

            const resultados = filtrarAlumnosPorTermino(rows, termino);
            event.reply("resultados-busqueda", resultados);
        } catch (error) {
            console.error("Error en buscar-estudiantes:", error);
            event.reply("resultados-busqueda", []);
        }
    });

    ipcMain.handle("eliminar-estudiante", async (_event, id) => {
        try {
            if (!esIdValido(id)) {
                return { success: false, message: "ID inválido." };
            }

            const matricula = await dbGet(`
                SELECT
                    m.*,
                    a.nombres,
                    a.apellidos
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.id = ?
            `, [id]);

            if (!matricula) {
                return { success: false, message: "No se encontró la matrícula." };
            }

            await dbRun(`
                UPDATE matriculas
                SET estado_matricula = 'eliminado',
                    updated_at = ?
                WHERE id = ?
            `, [obtenerFechaLocalSQL(), id]);

            await recalcularDescuentoHermanos(matricula.grupo_familiar);

            await registrarHistorial?.(
                "ELIMINAR",
                `Eliminó la matrícula de ${matricula.nombres} ${matricula.apellidos}`
            );

            return { success: true };
        } catch (error) {
            console.error("Error al eliminar matrícula:", error);
            return { success: false, message: "No se pudo eliminar la matrícula." };
        }
    });

    ipcMain.on("recuperar-estudiante", async (event, id) => {
        try {
            if (!esIdValido(id)) return;

            const matricula = await dbGet(`
                SELECT
                    m.*,
                    a.nombres,
                    a.apellidos
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.id = ?
            `, [id]);

            if (!matricula) return;

            await dbRun(`
                UPDATE matriculas
                SET estado_matricula = 'activo',
                    updated_at = ?
                WHERE id = ?
            `, [obtenerFechaLocalSQL(), id]);

            await recalcularDescuentoHermanos(matricula.grupo_familiar);

            await registrarHistorial?.(
                "RECUPERAR",
                `Recuperó la matrícula de ${matricula.nombres} ${matricula.apellidos}`
            );

            event.reply("estudiante-recuperado");
        } catch (error) {
            console.error("Error al recuperar matrícula:", error);
        }
    });

    ipcMain.on("traer-eliminados", async (event) => {
        try {
            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                event.reply("lista-eliminados", []);
                return;
            }

            const rows = await dbAll(`
                SELECT
                    m.id,
                    m.alumno_id,
                    m.periodo_id,
                    a.cedula,
                    a.apellidos,
                    a.nombres,
                    a.sexo,
                    a.correo,
                    m.pagado,
                    m.seguro,
                    m.pagado_donacion,
                    m.pagado_informatica,
                    m.pagado_carnet,
                    m.pagado_odontologia,
                    m.pagado_seguro,
                    m.grado,
                    m.cti,
                    m.hermano,
                    m.grupo_familiar,
                    m.descuento_hermano,
                    m.estado_pago,
                    m.estado_matricula AS estado_estudiante,
                    m.promocion,
                    m.observaciones
                FROM matriculas m
                INNER JOIN alumnos a ON a.id = m.alumno_id
                WHERE m.estado_matricula = 'eliminado'
                  AND m.periodo_id = ?
                ORDER BY m.id ASC
            `, [periodoId]);

            event.reply("lista-eliminados", rows);
        } catch (error) {
            console.error("Error obteniendo período activo en traer-eliminados:", error);
            event.reply("lista-eliminados", []);
        }
    });

    ipcMain.handle("buscar-alumnos-global", async (_event, termino) => {
        try {
            const resultados = await buscarAlumnosGlobales(termino);
            return { success: true, resultados };
        } catch (error) {
            console.error("Error buscando alumnos globales:", error);
            return { success: false, resultados: [], message: "No se pudo buscar alumnos." };
        }
    });

    ipcMain.handle("matricular-alumno-existente", async (_event, data) => {
        try {
            const alumnoId = Number(data?.alumno_id);
            const grado = String(data?.grado || "").trim();
            const cti = normalizarSiNoSeguro(data?.cti);
            const hermano = normalizarSiNoSeguro(data?.hermano);
            const hermanosRelacionados = sanitizarIdsRelacionados(data?.hermanosRelacionados);

            if (!esIdValido(alumnoId)) {
                return { success: false, message: "Alumno inválido." };
            }

            if (!grado) {
                return { success: false, message: "Debe indicar el grado." };
            }

            if (hermano === "Si" && hermanosRelacionados.length === 0) {
                return { success: false, message: "Debe seleccionar al menos un hermano." };
            }

            const periodoId = await obtenerPeriodoActivoId();

            if (!periodoId) {
                return { success: false, message: "No hay un período académico activo." };
            }

            const periodoActivo = await obtenerPeriodoActivoCompleto();

            if (!periodoActivo) {
                return { success: false, message: "No hay un período académico activo." };
            }

            if (periodoActivo.estado !== "activo") {
                return { success: false, message: "No se puede matricular en un período cerrado." };
            }

            const alumno = await dbGet(`
                SELECT *
                FROM alumnos
                WHERE id = ?
            `, [alumnoId]);

            if (!alumno) {
                return { success: false, message: "El alumno no existe." };
            }

            const matriculaExistente = await dbGet(`
                SELECT id
                FROM matriculas
                WHERE alumno_id = ? AND periodo_id = ?
            `, [alumnoId, periodoId]);

            if (matriculaExistente) {
                return { success: false, message: "Ese estudiante ya está matriculado en el período activo." };
            }

            const grupoExistente = await obtenerGrupoFamiliarDesdeHermanos(hermanosRelacionados);

            const grupoFamiliarFinal =
                hermano === "Si" && hermanosRelacionados.length > 0
                    ? (grupoExistente || generarGrupoFamiliar())
                    : null;

            const fechaActual = obtenerFechaLocalSQL();

            const resultado = await dbRun(`
                INSERT INTO matriculas (
                    alumno_id,
                    periodo_id,
                    grado,
                    cti,
                    hermano,
                    grupo_familiar,
                    descuento_hermano,
                    pagado,
                    seguro,
                    pagado_donacion,
                    pagado_informatica,
                    pagado_carnet,
                    pagado_odontologia,
                    pagado_seguro,
                    estado_pago,
                    estado_matricula,
                    promocion,
                    observaciones,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                alumnoId,
                periodoId,
                grado,
                cti || "",
                hermano || "",
                grupoFamiliarFinal,
                "No",
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                "Pendiente",
                "activo",
                "pendiente",
                "",
                fechaActual,
                fechaActual
            ]);

            await asignarGrupoFamiliarAHermanos(grupoFamiliarFinal, hermanosRelacionados);
            await recalcularDescuentoHermanos(grupoFamiliarFinal);

            await registrarHistorial?.(
                "MATRICULAR_EXISTENTE",
                `Matriculó a ${alumno.nombres} ${alumno.apellidos} en el período ${periodoActivo.nombre} con grado ${grado}${cti === "Si" ? ", CTI" : ""}${hermano === "Si" ? ", con hermanos asociados" : ""}`
            );

            return { success: true, matriculaId: resultado.lastID };
        } catch (error) {
            console.error("Error matriculando alumno existente:", error);
            return { success: false, message: "No se pudo matricular el estudiante existente." };
        }
    });

    ipcMain.handle("obtener-historial-academico", async (_event, alumnoId) => {
        try {
            if (!esIdValido(alumnoId)) {
                return { success: false, data: [], message: "Alumno inválido." };
            }

            const historial = await dbAll(`
                SELECT
                    p.nombre AS periodo,
                    m.id AS matricula_id,
                    m.grado,
                    m.cti,
                    m.hermano,
                    m.descuento_hermano,
                    m.pagado,
                    m.seguro,
                    m.estado_pago,
                    m.estado_matricula,
                    m.promocion,
                    m.observaciones
                FROM matriculas m
                INNER JOIN periodos_academicos p ON p.id = m.periodo_id
                WHERE m.alumno_id = ?
                ORDER BY m.periodo_id DESC, m.id DESC
            `, [alumnoId]);

            return { success: true, data: historial };
        } catch (error) {
            console.error("Error obteniendo historial académico:", error);
            return { success: false, data: [], message: "No se pudo obtener el historial académico." };
        }
    });
}

module.exports = {
    registerEstudiantesIpc
};