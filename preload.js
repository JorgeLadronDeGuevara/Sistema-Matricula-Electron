const { contextBridge, ipcRenderer } = require("electron");

function esTextoSeguro(valor, max = 300) {
    return typeof valor === "string" && valor.trim().length > 0 && valor.trim().length <= max;
}

function esNumeroEnteroPositivo(valor) {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0;
}

function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function validarObjetoEstudiante(est) {
    if (!esObjeto(est)) return false;
    if (!esTextoSeguro(est.cedula, 30)) return false;
    if (!esTextoSeguro(est.nombres, 120)) return false;
    if (!esTextoSeguro(est.apellidos, 120)) return false;
    if (!esTextoSeguro(est.grado, 30)) return false;

    if (est.correo && typeof est.correo !== "string") return false;
    if (est.sexo && !["M", "F", ""].includes(String(est.sexo))) return false;

    return true;
}

function validarGuardarArchivo(opciones) {
    if (!esObjeto(opciones)) return false;
    if (opciones.title && typeof opciones.title !== "string") return false;
    if (opciones.defaultPath && typeof opciones.defaultPath !== "string") return false;
    if (opciones.filters && !Array.isArray(opciones.filters)) return false;
    return true;
}

function validarEscrituraArchivo(obj) {
    if (!esObjeto(obj)) return false;
    if (!esTextoSeguro(obj.ruta, 500)) return false;
    if (obj.data === undefined || obj.data === null) return false;
    return true;
}

function suscribir(canal, callback) {
    if (!esTextoSeguro(canal, 100) || typeof callback !== "function") {
        return () => {};
    }

    const handler = (_event, data) => callback(data);
    ipcRenderer.on(canal, handler);

    return () => {
        ipcRenderer.removeListener(canal, handler);
    };
}

const api = Object.freeze({
    // ===== AUTH =====
    login: (usuario, password) => {
        const u = String(usuario || "").trim();
        const p = String(password || "");
        return ipcRenderer.invoke("login", u, p);
    },

    logout: () => ipcRenderer.invoke("logout"),

    getSession: () => ipcRenderer.invoke("get-session"),

    onSesionActualizada: (callback) => suscribir("sesion-actualizada", callback),

    // ===== ESTUDIANTES =====
    insertarEstudiante: (data) => {
        if (!validarObjetoEstudiante(data)) {
            console.error("Datos inválidos para insertar estudiante");
            return false;
        }
        ipcRenderer.send("insertar-estudiante", data);
        return true;
    },

    actualizarEstudiante: (data) => {
        if (!esObjeto(data) || !esNumeroEnteroPositivo(data.id)) {
            console.error("Datos inválidos para actualizar estudiante");
            return false;
        }
        ipcRenderer.send("actualizar-estudiante", data);
        return true;
    },

    eliminarEstudiante: (id) => {
        if (!esNumeroEnteroPositivo(id)) {
            return Promise.resolve({ success: false, message: "ID inválido." });
        }
        return ipcRenderer.invoke("eliminar-estudiante", Number(id));
    },

    recuperarEstudiante: (id) => {
        if (!esNumeroEnteroPositivo(id)) {
            console.error("ID inválido para recuperar estudiante");
            return false;
        }
        ipcRenderer.send("recuperar-estudiante", Number(id));
        return true;
    },

    traerEstudiantes: () => ipcRenderer.send("traer-estudiantes"),

    buscarEstudiantes: (termino) => {
        ipcRenderer.send("buscar-estudiantes", String(termino || ""));
    },

    insertarMuchosEstudiantes: (lista) => {
        if (!Array.isArray(lista)) {
            console.error("Lista inválida para importar estudiantes");
            return false;
        }
        ipcRenderer.send("insertar-muchos-estudiantes", lista);
        return true;
    },

    traerEliminados: () => ipcRenderer.send("traer-eliminados"),

    buscarAlumnosGlobal: (termino) =>
        ipcRenderer.invoke("buscar-alumnos-global", String(termino || "").trim()),

    matricularAlumnoExistente: (data) => {
        if (!esObjeto(data)) {
            return Promise.resolve({ success: false, message: "Datos inválidos." });
        }
        return ipcRenderer.invoke("matricular-alumno-existente", data);
    },

    obtenerHistorialAcademico: (alumnoId) => {
        const idNum = Number(alumnoId);
        if (!esNumeroEnteroPositivo(idNum)) {
            return Promise.resolve({ success: false, data: [], message: "Alumno inválido." });
        }
        return ipcRenderer.invoke("obtener-historial-academico", idNum);
    },

    // ===== PAGOS / COMPROBANTES =====
    obtenerHistorialPagos: (matriculaId) => {
        const idNum = Number(matriculaId);
        if (!esNumeroEnteroPositivo(idNum)) {
            console.error("ID inválido para historial de pagos");
            return false;
        }
        ipcRenderer.send("obtener-historial-pagos", idNum);
        return true;
    },

    abrirComprobanteDesdeHistorial: (numeroComprobante) =>
        ipcRenderer.invoke(
            "abrir-comprobante-desde-historial",
            String(numeroComprobante || "").trim()
        ),

    abrirVistaPreviaComprobante: (comprobante) => {
        if (!esObjeto(comprobante)) {
            return Promise.resolve({ success: false, message: "Comprobante inválido." });
        }
        return ipcRenderer.invoke("abrir-vista-previa-comprobante", comprobante);
    },

    imprimirDesdeVistaPrevia: () => ipcRenderer.invoke("imprimir-desde-vista-previa"),
    cerrarVistaPrevia: () => ipcRenderer.send("cerrar-vista-previa"),

    // ===== PERÍODOS =====
    obtenerPeriodos: () => ipcRenderer.invoke("obtener-periodos"),
    obtenerPeriodoActivo: () => ipcRenderer.invoke("obtener-periodo-activo"),

    crearPeriodoAcademico: (data) => {
        if (!esObjeto(data)) {
            return Promise.resolve({ success: false, message: "Datos inválidos." });
        }
        return ipcRenderer.invoke("crear-periodo-academico", data);
    },

    cambiarPeriodoActivo: (periodoId) => {
        if (!esNumeroEnteroPositivo(periodoId)) {
            return Promise.resolve({ success: false, message: "ID de período inválido." });
        }
        return ipcRenderer.invoke("cambiar-periodo-activo", Number(periodoId));
    },

    // ===== ARCHIVOS / BACKUPS =====
    guardarArchivo: (opciones) => {
        if (!validarGuardarArchivo(opciones)) {
            return Promise.resolve(null);
        }
        return ipcRenderer.invoke("guardar-archivo", opciones);
    },

    abrirDialogoExcel: () => ipcRenderer.invoke("abrir-dialogo-excel"),


    crearRespaldoDB: () => ipcRenderer.invoke("crear-respaldo-db"),
    restaurarRespaldoDB: () => ipcRenderer.invoke("restaurar-respaldo-db"),

    leerArchivo: (ruta) => {
        const rutaSegura = String(ruta || "").trim();
        if (!rutaSegura) {
            return Promise.resolve(null);
        }
        return ipcRenderer.invoke("leer-archivo", rutaSegura);
    },

    escribirArchivo: (obj) => {
        if (!validarEscrituraArchivo(obj)) {
            return Promise.resolve({ success: false, message: "Datos inválidos para escribir archivo." });
        }
        return ipcRenderer.invoke("escribir-archivo", obj);
    },

    listarUsuarios: () => ipcRenderer.invoke("usuarios:listar"),

    crearUsuario: (datos) => {
        if (!esObjeto(datos)) {
            return Promise.resolve({ success: false, message: "Datos inválidos." });
        }

        return ipcRenderer.invoke("usuarios:crear", datos);
    },

    actualizarUsuario: (id, datos) => {
        if (!esNumeroEnteroPositivo(id) || !esObjeto(datos)) {
            return Promise.resolve({ success: false, message: "Datos inválidos." });
        }

        return ipcRenderer.invoke("usuarios:actualizar", Number(id), datos);
    },

    cambiarPasswordUsuario: (id, nuevaPassword) => {
        if (!esNumeroEnteroPositivo(id) || !esTextoSeguro(nuevaPassword, 120)) {
            return Promise.resolve({ success: false, message: "Datos inválidos." });
        }

        return ipcRenderer.invoke("usuarios:cambiar-password", Number(id), String(nuevaPassword));
    },

    // ===== AUDITORÍA / EVENTOS =====
    obtenerHistorial: () => ipcRenderer.send("obtener-historial"),

    onListaEstudiantes: (callback) => suscribir("resultados-busqueda", callback),
    onEstudianteInsertado: (callback) => suscribir("estudiante-insertado", callback),
    onEstudianteActualizado: (callback) => suscribir("estudiante-actualizado", callback),
    onEstudiantesInsertados: (callback) => suscribir("estudiantes-insertados", callback),
    onListaEliminados: (callback) => suscribir("lista-eliminados", callback),
    onEstudianteRecuperado: (callback) => suscribir("estudiante-recuperado", callback),
    onHistorial: (callback) => suscribir("historial-data", callback),
    onHistorialPagos: (callback) => suscribir("historial-pagos-data", callback),
    onErrorInsertar: (callback) => suscribir("error-insertar", callback),
    onComprobanteGenerado: (callback) => suscribir("comprobante-generado", callback),

    onCargarExcel: (callback) => suscribir("cargar-excel", callback),

    onExportarPDF: (callback) => suscribir("exportar-pdf", callback),
    onExportarPDFCancelados: (callback) => suscribir("exportar-pdf-cancelados", callback),
    onExportarPDFDeudores: (callback) => suscribir("exportar-pdf-deudores", callback),
    onExportarPDFAbonados: (callback) => suscribir("exportar-pdf-abonados", callback),
    onExportarExcel: (callback) => suscribir("exportar-excel-completo", callback)
});

contextBridge.exposeInMainWorld("api", api);