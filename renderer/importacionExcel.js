import { mostrarAlerta } from "./ui.js";

function mapearFilaExcel(fila) {
    return {
        cedula: fila.Cedula ?? fila.Cédula ?? fila.cedula ?? fila.cédula ?? "",
        apellidos: fila.Apellidos ?? fila.apellidos ?? "",
        nombres: fila.Nombres ?? fila.nombres ?? "",
        sexo: fila.Sexo ?? fila.sexo ?? "",
        correo: fila.Correo ?? fila.correo ?? "",
        grado: fila.Grado ?? fila.grado ?? "",
        cti: fila.CTI ?? fila.CIT ?? fila.cti ?? fila.cit ?? "",
        hermano: fila.HERMANO ?? fila.Hermano ?? fila.hermano ?? ""
    };
}

function esFilaUtil(item) {
    return (
        String(item.cedula || "").trim() ||
        String(item.nombres || "").trim() ||
        String(item.apellidos || "").trim() ||
        String(item.grado || "").trim()
    );
}

export function initImportacionExcel() {
    window.api.onCargarExcel(async (ruta) => {
        try {
            if (!ruta) {
                mostrarAlerta("No se recibió la ruta del archivo Excel.");
                return;
            }

            const data = await window.api.leerArchivo(ruta);

            if (!data) {
                mostrarAlerta("No se pudo leer el archivo Excel.");
                return;
            }

            const workbook = XLSX.read(data, { type: "buffer" });
            const nombreHoja = workbook.SheetNames[0];
            const hoja = workbook.Sheets[nombreHoja];

            const filasCrudas = XLSX.utils.sheet_to_json(hoja, {
                defval: "",
                raw: false
            });

            if (!Array.isArray(filasCrudas) || filasCrudas.length === 0) {
                mostrarAlerta("El archivo Excel está vacío o no tiene datos válidos.");
                return;
            }

            const lista = filasCrudas.map(mapearFilaExcel);
            const filasValidas = lista.filter(esFilaUtil);

            if (filasValidas.length === 0) {
                mostrarAlerta("No se encontraron filas útiles para importar.");
                return;
            }

            window.api.insertarMuchosEstudiantes(filasValidas);
        } catch (error) {
            console.error("Error cargando Excel:", error);
            mostrarAlerta("Ocurrió un error al procesar el archivo Excel.");
        }
    });
}