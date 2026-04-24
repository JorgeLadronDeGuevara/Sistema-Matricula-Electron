const { ipcMain, dialog } = require("electron");
const { leerArchivo, escribirArchivo } = require("./service");

function esObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function sanitizarOpcionesGuardar(opciones = {}) {
    if (!esObjeto(opciones)) {
        return null;
    }

    const title = typeof opciones.title === "string" ? opciones.title.trim() : "Guardar archivo";
    const defaultPath =
        typeof opciones.defaultPath === "string" ? opciones.defaultPath.trim() : undefined;

    const filters = Array.isArray(opciones.filters)
        ? opciones.filters
              .filter(f => esObjeto(f))
              .map(f => ({
                  name: typeof f.name === "string" ? f.name.trim() : "Archivo",
                  extensions: Array.isArray(f.extensions)
                      ? f.extensions
                            .filter(ext => typeof ext === "string" && /^[a-zA-Z0-9]+$/.test(ext))
                            .map(ext => ext.toLowerCase())
                      : []
              }))
              .filter(f => f.extensions.length > 0)
        : [];

    return {
        title,
        defaultPath,
        filters
    };
}

function registerFilesIpc() {
    ipcMain.handle("leer-archivo", async (_event, ruta) => {
        if (typeof ruta !== "string" || !ruta.trim()) {
            return null;
        }

        return await leerArchivo(ruta.trim());
    });

    ipcMain.handle("escribir-archivo", async (_event, obj) => {
        if (!esObjeto(obj) || typeof obj.ruta !== "string" || !obj.ruta.trim()) {
            return { success: false, message: "Parámetros inválidos para escribir archivo." };
        }

        return await escribirArchivo({
            ruta: obj.ruta.trim(),
            data: obj.data
        });
    });

    ipcMain.handle("guardar-archivo", async (_event, opciones) => {
        const opcionesSeguras = sanitizarOpcionesGuardar(opciones);

        if (!opcionesSeguras) {
            return null;
        }

        const res = await dialog.showSaveDialog(opcionesSeguras);

        if (res.canceled) return null;

        return res.filePath || null;
    });

    ipcMain.handle("abrir-dialogo-excel", async (event) => {
        const res = await dialog.showOpenDialog({
            title: "Seleccionar archivo Excel",
            properties: ["openFile"],
            filters: [
                { name: "Archivos Excel", extensions: ["xlsx", "xls"] }
            ]
        });

        if (res.canceled || !res.filePaths?.length) {
            return null;
        }

        const ruta = res.filePaths[0];
        event.sender.send("cargar-excel", ruta);

        return ruta;
    });
}

module.exports = {
    registerFilesIpc
};