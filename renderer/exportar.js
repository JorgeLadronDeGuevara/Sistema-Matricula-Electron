// exportar.js

import { calcularEstado, formatoDinero } from "./utils.js";
import { getEstudiantesGlobal } from "./state.js";
import { mostrarAlerta, mostrarToast } from "./ui.js";

function obtenerDescuentoActual(est) {
    return est?.descuento_hermano ?? est?.descuentoHermano ?? "No";
}

export function exportarTodosPDF() {
    if (getEstudiantesGlobal().length === 0) {
        mostrarAlerta("No hay datos para exportar");
        return;
    }

    exportarPDFPersonalizado(
        getEstudiantesGlobal(),
        "estudiantes.pdf",
        "PDF de estudiantes exportado correctamente."
    );
}

export function exportarPDFPorEstado(estado, nombreArchivo, mensajeExito = "PDF exportado correctamente.") {
    const lista = getEstudiantesGlobal().filter(e =>
        calcularEstado(
            e.pagado,
            e.seguro,
            e.cti,
            e.hermano,
            obtenerDescuentoActual(e)
        ) === estado
    );

    if (lista.length === 0) {
        mostrarAlerta(`No hay estudiantes del período activo en estado ${estado}`);
        return;
    }

    exportarPDFPersonalizado(lista, nombreArchivo, mensajeExito);
}

export async function exportarPDFPersonalizado(lista, nombreArchivo, mensajeExito = "PDF exportado correctamente.") {

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
        calcularEstado(
            e.pagado,
            e.seguro,
            e.cti,
            e.hermano,
            obtenerDescuentoActual(e)
        )
    ]);

    doc.text("Sistema de Matrícula Escolar - Período activo", 14, 15);

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

    if (ruta) {
        const buffer = doc.output("arraybuffer");
        const res = await window.api.escribirArchivo({ ruta, data: buffer });

        if (res?.success) {
            mostrarToast(mensajeExito, "success");
        } else {
            mostrarAlerta(res?.message || "No se pudo guardar el PDF.");
        }
    }
}

export function exportarPDFCancelados() {
    exportarPDFPorEstado(
        "Cancelado",
        "cancelados.pdf",
        "PDF de pagos cancelados exportado correctamente."
    );
}

export function exportarPDFPendientes() {
    exportarPDFPorEstado(
        "Pendiente",
        "deudores.pdf",
        "PDF de pagos pendientes exportado correctamente."
    );
}

export function exportarPDFAbonados() {
    exportarPDFPorEstado(
        "Abonado",
        "abonados.pdf",
        "PDF de pagos abonados exportado correctamente."
    );
}

export async function exportarExcelCompleto(){

    if(getEstudiantesGlobal().length === 0){
        mostrarAlerta("No hay datos para exportar");        
        return;
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
            CTI: e.cti,
            Hermano: e.hermano,
            Estado: calcularEstado(
                e.pagado,
                e.seguro,
                e.cti,
                e.hermano,
                obtenerDescuentoActual(e)
            )
        }));

        const hoja = XLSX.utils.json_to_sheet(datos);
        XLSX.utils.book_append_sheet(libro, hoja, nombre);
    }

    const pendientes = getEstudiantesGlobal().filter(e =>
        calcularEstado(
            e.pagado,
            e.seguro,
            e.cti,
            e.hermano,
            obtenerDescuentoActual(e)
        ) === "Pendiente"
    );

    const abonados = getEstudiantesGlobal().filter(e =>
        calcularEstado(
            e.pagado,
            e.seguro,
            e.cti,
            e.hermano,
            obtenerDescuentoActual(e)
        ) === "Abonado"
    );

    const cancelados = getEstudiantesGlobal().filter(e =>
        calcularEstado(
            e.pagado,
            e.seguro,
            e.cti,
            e.hermano,
            obtenerDescuentoActual(e)
        ) === "Cancelado"
    );
    
    crearHoja(getEstudiantesGlobal(), "Todos");
    crearHoja(pendientes, "Pendientes");
    crearHoja(abonados, "Abonados");
    crearHoja(cancelados, "Cancelados");

    const ruta = await window.api.guardarArchivo({
        title: "Guardar reporte",
        defaultPath: "reporte_matricula.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }]
    });

    if (ruta) {
        const arrayBuffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
        const res = await window.api.escribirArchivo({
            ruta,
            data: arrayBuffer
        });

        if (res?.success) {
            mostrarToast("Excel exportado correctamente.", "success");
        } else {
            mostrarAlerta(res?.message || "No se pudo guardar el archivo Excel.");
        }
    }
}