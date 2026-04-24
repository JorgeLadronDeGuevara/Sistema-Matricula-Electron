// service de files

const fs = require("fs");
const path = require("path");

const EXTENSIONES_LECTURA_PERMITIDAS = new Set([
    ".xls",
    ".xlsx",
    ".pdf",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".json",
    ".txt"
]);

const EXTENSIONES_ESCRITURA_PERMITIDAS = new Set([
    ".pdf",
    ".xlsx",
    ".xls",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".json",
    ".txt"
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function esRutaValida(ruta) {
    return typeof ruta === "string" && ruta.trim().length > 0;
}

function obtenerExtensionSegura(ruta) {
    return path.extname(String(ruta || "").trim()).toLowerCase();
}

function validarRutaLectura(ruta) {
    if (!esRutaValida(ruta)) {
        return { ok: false, message: "Ruta inválida." };
    }

    const extension = obtenerExtensionSegura(ruta);

    if (!EXTENSIONES_LECTURA_PERMITIDAS.has(extension)) {
        return { ok: false, message: `Extensión no permitida para lectura: ${extension || "desconocida"}` };
    }

    return { ok: true };
}

function validarRutaEscritura(ruta) {
    if (!esRutaValida(ruta)) {
        return { ok: false, message: "Ruta inválida." };
    }

    const extension = obtenerExtensionSegura(ruta);

    if (!EXTENSIONES_ESCRITURA_PERMITIDAS.has(extension)) {
        return { ok: false, message: `Extensión no permitida para escritura: ${extension || "desconocida"}` };
    }

    return { ok: true };
}

async function leerArchivo(ruta) {
    try {
        const validacion = validarRutaLectura(ruta);
        if (!validacion.ok) {
            return null;
        }

        if (!fs.existsSync(ruta)) {
            return null;
        }

        const stat = fs.statSync(ruta);

        if (!stat.isFile()) {
            return null;
        }

        if (stat.size > MAX_FILE_SIZE_BYTES) {
            console.error("Archivo demasiado grande para lectura segura:", ruta);
            return null;
        }

        return fs.readFileSync(ruta);
    } catch (error) {
        console.error("Error leyendo archivo:", error);
        return null;
    }
}

function normalizarDataEntrada(data) {
    if (Buffer.isBuffer(data)) {
        return data;
    }

    if (data instanceof Uint8Array) {
        return Buffer.from(data);
    }

    if (ArrayBuffer.isView(data)) {
        return Buffer.from(data.buffer);
    }

    if (data instanceof ArrayBuffer) {
        return Buffer.from(data);
    }

    if (typeof data === "string") {
        return Buffer.from(data, "utf8");
    }

    return null;
}

async function escribirArchivo({ ruta, data }) {
    try {
        const validacion = validarRutaEscritura(ruta);
        if (!validacion.ok) {
            return { success: false, message: validacion.message };
        }

        const buffer = normalizarDataEntrada(data);

        if (!buffer) {
            return { success: false, message: "Contenido de archivo inválido." };
        }

        if (buffer.length > MAX_FILE_SIZE_BYTES) {
            return { success: false, message: "El archivo excede el tamaño permitido." };
        }

        const directorio = path.dirname(ruta);

        if (!fs.existsSync(directorio)) {
            fs.mkdirSync(directorio, { recursive: true });
        }

        fs.writeFileSync(ruta, buffer, { flag: "w" });

        return { success: true };
    } catch (error) {
        console.error("Error escribiendo archivo:", error);
        return { success: false, message: "No se pudo escribir el archivo." };
    }
}

module.exports = {
    leerArchivo,
    escribirArchivo
};