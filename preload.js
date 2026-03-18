//preload.js
const { contextBridge, ipcRenderer } = require("electron");

function validarObjetoEstudiante(est){

    if(!est || typeof est !== "object") return false;

    if(typeof est.cedula !== "string") return false;

    if(typeof est.nombres !== "string") return false;

    if(typeof est.apellidos !== "string") return false;

    if(typeof est.grado !== "string") return false;

    if(typeof est.pagado !== "number") return false;

    if(typeof est.seguro !== "number") return false;

    return true;
}

contextBridge.exposeInMainWorld("api", {

    login: (usuario,password) => ipcRenderer.invoke("login",usuario,password),
    
    insertarEstudiante: (data) => {

    if(!validarObjetoEstudiante(data)){
        console.error("Datos inválidos")
        return
    }

    ipcRenderer.send("insertar-estudiante",data)

    },

    actualizarEstudiante: (data) => ipcRenderer.send("actualizar-estudiante", data),

    eliminarEstudiante: (id) => ipcRenderer.invoke("eliminar-estudiante", id),

    guardarArchivo: (opciones) => ipcRenderer.invoke("guardar-archivo", opciones),

    traerEstudiantes: () => ipcRenderer.send("traer-estudiantes"),

    buscarEstudiantes: (termino) => ipcRenderer.send("buscar-estudiantes", termino),

    insertarMuchosEstudiantes: (lista) => ipcRenderer.send("insertar-muchos-estudiantes", lista),

    leerArchivo: (ruta) => ipcRenderer.invoke("leer-archivo", ruta),

    escribirArchivo: (obj) => ipcRenderer.invoke("escribir-archivo", obj),

    onListaEstudiantes: (callback) =>
    ipcRenderer.on("resultados-busqueda", (event, data) => callback(data)),

    onResultadosBusqueda: (callback) =>
        ipcRenderer.on("resultados-busqueda", (event, data) => callback(data)),

    onEstudianteInsertado: (callback) =>
        ipcRenderer.on("estudiante-insertado", callback),

    onEstudianteActualizado: (callback) =>
        ipcRenderer.on("estudiante-actualizado", callback),

    onEstudiantesInsertados: (callback) =>
        ipcRenderer.on("estudiantes-insertados", callback),

    onCargarExcel: (callback) =>
        ipcRenderer.on("cargar-excel", (event, ruta) => callback(ruta)),

    onExportarPDF: (callback) =>
        ipcRenderer.on("exportar-pdf", callback),

    onExportarPDFCancelados: (callback) =>
        ipcRenderer.on("exportar-pdf-cancelados", callback),

    onExportarPDFDeudores: (callback) =>
        ipcRenderer.on("exportar-pdf-deudores", callback),

    onExportarPDFAbonados: (callback) =>
        ipcRenderer.on("exportar-pdf-abonados", callback),

    onExportarExcel: (callback) =>
        ipcRenderer.on("exportar-excel-completo", callback),

    traerEliminados: () => ipcRenderer.send("traer-eliminados"),

    onListaEliminados: (callback) =>
        ipcRenderer.on("lista-eliminados", (event, lista) => callback(lista)),

    recuperarEstudiante: (id) => ipcRenderer.send("recuperar-estudiante", id),

    onEstudianteRecuperado: (callback) =>
        ipcRenderer.on("estudiante-recuperado", callback)
    

});