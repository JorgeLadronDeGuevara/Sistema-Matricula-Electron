// exportar.js

import { calcularEstado, formatoDinero } from "./utils.js";
import { getEstudiantesGlobal } from "./state.js";
import { mostrarAlerta } from "./ui.js";

export function exportarTodosPDF(){

    if(getEstudiantesGlobal().length === 0){
        mostrarAlerta("No hay datos para exportar");        return;
    }
    exportarPDFPersonalizado(getEstudiantesGlobal(),"estudiantes.pdf");
}

export function exportarPDFPorEstado(estado, nombreArchivo){

    const lista = getEstudiantesGlobal().filter(e => calcularEstado(e.pagado, e.seguro, e.cit, e.hermano) === estado);

    if(lista.length === 0){
    mostrarAlerta(`No hay estudiantes en estado ${estado}`);        return;
    }

    exportarPDFPersonalizado(lista, nombreArchivo);
}

export async function exportarPDFPersonalizado(lista,nombreArchivo){

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const columnas = [
        "Cedula",
        "Apellidos",
        "Nombres",
        "Matricula",
        "Seguro",
        "Grado",
        "Estado"
    ];

    const filas = lista.map(e => [
        e.cedula,
        e.apellidos,
        e.nombres,
        formatoDinero(e.pagado),
        formatoDinero(e.seguro),
        e.grado,
        calcularEstado(e.pagado, e.seguro, e.cit, e.hermano)
    ]);

    doc.text("Sistema de Matrícula Escolar", 14, 15);

    doc.autoTable({
        head:[columnas],
        body:filas,
        startY:25
    });

   const ruta = await window.api.guardarArchivo({
        title:"Guardar PDF",
        defaultPath:nombreArchivo,
        filters:[{name:"PDF",extensions:["pdf"]}]
    });

    if(ruta){
        const buffer = doc.output("arraybuffer");
        await window.api.escribirArchivo({ ruta, data: buffer });
    }
}

export function exportarPDFCancelados(){
    exportarPDFPorEstado("Cancelado","cancelados.pdf");
}

export function exportarPDFPendientes(){
    exportarPDFPorEstado("Pendiente","deudores.pdf");
}

export function exportarPDFAbonados(){
    exportarPDFPorEstado("Abonado","abonados.pdf");
}

export async function exportarExcelCompleto(){

    if(getEstudiantesGlobal().length === 0){
    mostrarAlerta("No hay datos para exportar");        return;
    }

    const libro = XLSX.utils.book_new();

    function crearHoja(lista, nombre){

        const datos = lista.map(e => ({
            Cedula: e.cedula,
            Apellidos: e.apellidos,
            Nombres: e.nombres,
            Sexo: e.sexo,
            Correo: e.correo,
            Matricula: e.pagado,
            Seguro: e.seguro,
            Grado: e.grado,
            CIT: e.cit,
            Hermano: e.hermano,
            Estado: calcularEstado(e.pagado, e.seguro, e.cit, e.hermano)
        }));

        const hoja = XLSX.utils.json_to_sheet(datos);
        XLSX.utils.book_append_sheet(libro, hoja, nombre);
    }

    const pendientes = getEstudiantesGlobal().filter(e => calcularEstado(e.pagado, e.seguro, e.cit, e.hermano) === "Pendiente");
    const abonados  = getEstudiantesGlobal().filter(e => calcularEstado(e.pagado, e.seguro, e.cit, e.hermano) === "Abonado");
    const cancelados = getEstudiantesGlobal().filter(e => calcularEstado(e.pagado, e.seguro, e.cit, e.hermano) === "Cancelado");

    crearHoja(getEstudiantesGlobal(), "Todos");
    crearHoja(pendientes, "Pendientes");
    crearHoja(abonados, "Abonados");
    crearHoja(cancelados, "Cancelados");

    const ruta = await window.api.guardarArchivo({
        title: "Guardar reporte",
        defaultPath: "reporte_matricula.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }]
    });

    if(ruta){
        const arrayBuffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
        await window.api.escribirArchivo({
            ruta,
            data: arrayBuffer
        });   
    }
}