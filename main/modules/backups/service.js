// service de backups

const fs = require("fs");
const path = require("path");

const EXTENSIONES_BACKUP_VALIDAS = new Set([".db", ".sqlite", ".sqlite3"]);
const MAX_BACKUP_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const SQLITE_HEADER = "SQLite format 3\u0000";

function obtenerFechaArchivoBackup() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    const segundos = String(ahora.getSeconds()).padStart(2, "0");

    return `${anio}-${mes}-${dia}_${horas}-${minutos}-${segundos}`;
}

function obtenerDirectorioBackups(app) {
    return path.join(app.getPath("userData"), "backups");
}

function asegurarDirectorioBackups(app) {
    const backupsDir = obtenerDirectorioBackups(app);

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    return backupsDir;
}

function limpiarBackupsAntiguos(app, maxArchivos = 7) {
    const backupsDir = obtenerDirectorioBackups(app);

    if (!fs.existsSync(backupsDir)) return;

    const archivos = fs.readdirSync(backupsDir)
        .map(nombre => {
            const rutaCompleta = path.join(backupsDir, nombre);
            const stat = fs.statSync(rutaCompleta);

            return {
                nombre,
                ruta: rutaCompleta,
                mtime: stat.mtimeMs,
                esArchivo: stat.isFile()
            };
        })
        .filter(item =>
            item.esArchivo &&
            EXTENSIONES_BACKUP_VALIDAS.has(path.extname(item.nombre).toLowerCase())
        )
        .sort((a, b) => b.mtime - a.mtime);

    const excedentes = archivos.slice(maxArchivos);

    excedentes.forEach(item => {
        try {
            fs.unlinkSync(item.ruta);
        } catch (error) {
            console.error("No se pudo eliminar backup antiguo:", item.ruta, error);
        }
    });
}

function validarArchivoBackup(rutaArchivo) {
    if (!rutaArchivo || typeof rutaArchivo !== "string") {
        throw new Error("Ruta de archivo inválida.");
    }

    if (!fs.existsSync(rutaArchivo)) {
        throw new Error("El archivo de respaldo no existe.");
    }

    const stat = fs.statSync(rutaArchivo);

    if (!stat.isFile()) {
        throw new Error("La ruta seleccionada no es un archivo válido.");
    }

    if (stat.size <= 0) {
        throw new Error("El archivo de respaldo está vacío.");
    }

    if (stat.size > MAX_BACKUP_SIZE_BYTES) {
        throw new Error("El archivo de respaldo excede el tamaño permitido.");
    }

    const extension = path.extname(rutaArchivo).toLowerCase();
    if (!EXTENSIONES_BACKUP_VALIDAS.has(extension)) {
        throw new Error("Formato de archivo no válido para respaldo/restauración.");
    }
}

function validarFirmaSQLite(rutaArchivo) {
    const fd = fs.openSync(rutaArchivo, "r");

    try {
        const buffer = Buffer.alloc(16);
        const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);

        if (bytesRead < 16) {
            throw new Error("El archivo es demasiado pequeño para ser una base SQLite válida.");
        }

        const header = buffer.toString("utf8");
        if (header !== SQLITE_HEADER) {
            throw new Error("El archivo seleccionado no parece ser una base de datos SQLite válida.");
        }
    } finally {
        fs.closeSync(fd);
    }
}

function copiarArchivoSeguro(origen, destino) {
    fs.copyFileSync(origen, destino);
}

async function crearRespaldoBaseDeDatos({ dbPath, dialog, registrarHistorial }) {
    validarArchivoBackup(dbPath);
    validarFirmaSQLite(dbPath);

    const nombreSugerido = `respaldo_matricula_${obtenerFechaArchivoBackup()}.db`;

    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Guardar respaldo de base de datos",
        defaultPath: nombreSugerido,
        filters: [
            { name: "Base de datos SQLite", extensions: ["db", "sqlite", "sqlite3"] }
        ]
    });

    if (canceled || !filePath) {
        return { success: false, canceled: true, message: "Respaldo cancelado." };
    }

    copiarArchivoSeguro(dbPath, filePath);

    await registrarHistorial?.("BACKUP", `Creó un respaldo manual de la base de datos en: ${filePath}`);

    return {
        success: true,
        filePath,
        message: "Respaldo creado correctamente."
    };
}

async function crearRespaldoAutomaticoBaseDeDatos({ app, dbPath }) {
    try {
        validarArchivoBackup(dbPath);
        validarFirmaSQLite(dbPath);

        const backupsDir = asegurarDirectorioBackups(app);
        const nombreArchivo = `auto_respaldo_${obtenerFechaArchivoBackup()}.db`;
        const destino = path.join(backupsDir, nombreArchivo);

        copiarArchivoSeguro(dbPath, destino);

        limpiarBackupsAntiguos(app, 7);

        console.log("Respaldo automático creado en:", destino);

        return {
            success: true,
            filePath: destino
        };
    } catch (error) {
        console.error("Error creando respaldo automático:", error);
        return {
            success: false,
            message: error.message || "No se pudo crear el respaldo automático."
        };
    }
}

async function restaurarRespaldoBaseDeDatos({
    app,
    dbPath,
    dialog,
    cerrarConexionBaseDeDatos,
    reabrirConexionBaseDeDatos,
    registrarHistorial
}) {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Seleccionar respaldo para restaurar",
        properties: ["openFile"],
        filters: [
            { name: "Base de datos SQLite", extensions: ["db", "sqlite", "sqlite3"] }
        ]
    });

    if (canceled || !filePaths || filePaths.length === 0) {
        return {
            success: false,
            canceled: true,
            message: "Restauración cancelada."
        };
    }

    const archivoRespaldo = filePaths[0];

    validarArchivoBackup(archivoRespaldo);
    validarFirmaSQLite(archivoRespaldo);

    const backupsDir = asegurarDirectorioBackups(app);
    const backupPrevio = path.join(
        backupsDir,
        `antes_de_restaurar_${obtenerFechaArchivoBackup()}.db`
    );

    if (fs.existsSync(dbPath)) {
        validarArchivoBackup(dbPath);
        copiarArchivoSeguro(dbPath, backupPrevio);
    }

    await cerrarConexionBaseDeDatos();

    try {
        copiarArchivoSeguro(archivoRespaldo, dbPath);
        await reabrirConexionBaseDeDatos();

        await registrarHistorial?.(
            "RESTAURAR_BACKUP",
            `Restauró la base de datos desde un respaldo seleccionado: ${archivoRespaldo}`
        );

        limpiarBackupsAntiguos(app, 7);

        return {
            success: true,
            filePath: archivoRespaldo,
            message: "La base de datos fue restaurada correctamente. La aplicación se reiniciará."
        };
    } catch (error) {
        console.error("Error restaurando respaldo:", error);

        try {
            if (fs.existsSync(backupPrevio)) {
                copiarArchivoSeguro(backupPrevio, dbPath);
                await reabrirConexionBaseDeDatos();
            }
        } catch (errorRollback) {
            console.error("Error recuperando base tras fallo de restauración:", errorRollback);
        }

        throw error;
    }
}

module.exports = {
    obtenerFechaArchivoBackup,
    obtenerDirectorioBackups,
    asegurarDirectorioBackups,
    limpiarBackupsAntiguos,
    validarArchivoBackup,
    validarFirmaSQLite,
    crearRespaldoBaseDeDatos,
    crearRespaldoAutomaticoBaseDeDatos,
    restaurarRespaldoBaseDeDatos
};