// main.js
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");

const { connect, getDb, setDb } = require("./db/connection");
const { inicializarBaseDeDatos } = require("./db/init");

const {
    obtenerPeriodoActivoId,
    obtenerPeriodoActivoCompleto,
    inicializarPeriodosAcademicos
} = require("./modules/periodos/service");

const { registerPeriodosIpc } = require("./modules/periodos/ipc");

const {
    crearRespaldoBaseDeDatos,
    crearRespaldoAutomaticoBaseDeDatos,
    restaurarRespaldoBaseDeDatos
} = require("./modules/backups/service");

const { registerBackupsIpc } = require("./modules/backups/ipc");
const { registerComprobantesIpc } = require("./modules/comprobantes/ipc");
const { abrirVistaPrevia } = require("./modules/comprobantes/service");
const { registerFilesIpc } = require("./modules/files/ipc");
const { registerEstudiantesIpc } = require("./modules/estudiantes/ipc");

const {
    registrarHistorialPago,
    registrarComprobantePago
} = require("./modules/pagos/service");

const { registerPagosIpc } = require("./modules/pagos/ipc");
const { registerAuditoriaIpc } = require("./modules/auditoria/ipc");
const { inicializarIPCUsuarios } = require("./modules/usuarios/ipc");

const {
    setUsuarioActual,
    getUsuarioActual,
    getSesionActual,
    clearUsuarioActual,
    haySesionActiva
} = require("./core/session");

const { registerAuth } = require("./core/auth");
const { createAudit } = require("./core/audit");
const { createMainWindow, createLoginWindow } = require("./core/windows");

const ROOT_DIR = path.join(__dirname, "..");
const dbPath = path.join(app.getPath("userData"), "database.db");

let win = null;
let loginWin = null;
let ipcsRegistrados = false;

function obtenerFechaLocalSQL() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    const segundos = String(ahora.getSeconds()).padStart(2, "0");

    return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

function conectarBaseDeDatos() {
    console.log("Base de datos en:", dbPath);
    connect(dbPath);
}

function enfocarVentana(windowRef) {
    if (!windowRef || windowRef.isDestroyed()) return false;

    if (windowRef.isMinimized()) {
        windowRef.restore();
    }

    windowRef.focus();
    return true;
}

function cerrarVentanaSegura(windowRef) {
    if (windowRef && !windowRef.isDestroyed()) {
        windowRef.close();
    }
}

function crearVentanaPrincipalSiNoExiste() {
    if (enfocarVentana(win)) return win;

    win = createMainWindow({
        ROOT_DIR,
        getOnCrearRespaldo: () => async () => {
            const res = await crearRespaldoBaseDeDatos({
                dbPath,
                dialog,
                registrarHistorial
            });

            if (!res?.success && !res?.canceled) {
                dialog.showErrorBox(
                    "Error de respaldo",
                    res?.message || "No se pudo crear el respaldo."
                );
            } else if (res?.success) {
                dialog.showMessageBox({
                    type: "info",
                    title: "Respaldo creado",
                    message: "El respaldo de la base de datos se creó correctamente."
                });
            }
        },
        getOnRestaurarRespaldo: () => async () => {
            const confirmacion = await dialog.showMessageBox({
                type: "warning",
                buttons: ["Cancelar", "Restaurar"],
                defaultId: 1,
                cancelId: 0,
                title: "Restaurar respaldo",
                message: "Esta acción reemplazará la base de datos actual.",
                detail: "Se hará un respaldo automático antes de restaurar. Luego la aplicación se reiniciará."
            });

            if (confirmacion.response !== 1) {
                return;
            }

            const res = await restaurarRespaldoBaseDeDatos({
                app,
                dbPath,
                dialog,
                cerrarConexionBaseDeDatos,
                reabrirConexionBaseDeDatos,
                registrarHistorial
            });

            if (!res?.success) {
                if (!res?.canceled) {
                    dialog.showErrorBox(
                        "Error de restauración",
                        res?.message || "No se pudo restaurar el respaldo."
                    );
                }
                return;
            }

            await dialog.showMessageBox({
                type: "info",
                title: "Restauración completada",
                message: "La base de datos fue restaurada correctamente.",
                detail: "La aplicación se reiniciará para aplicar los cambios."
            });

            app.relaunch();
            app.exit(0);
        }
    });

    win.on("closed", () => {
        win = null;
    });

    return win;
}

function crearVentanaLoginSiNoExiste() {
    if (enfocarVentana(loginWin)) return loginWin;

    loginWin = createLoginWindow({ ROOT_DIR });

    loginWin.on("closed", () => {
        loginWin = null;
    });

    return loginWin;
}

function reabrirConexionBaseDeDatos() {
    return new Promise((resolve, reject) => {
        try {
            const nuevaDb = connect(dbPath);
            setDb(nuevaDb);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

function cerrarConexionBaseDeDatos() {
    return new Promise((resolve, reject) => {
        let db;

        try {
            db = getDb();
        } catch (_error) {
            resolve(true);
            return;
        }

        db.close((err) => {
            if (err) {
                reject(err);
                return;
            }

            setDb(null);
            resolve(true);
        });
    });
}

function endurecerWebContentsGlobales() {
    app.on("web-contents-created", (_event, contents) => {
        contents.setWindowOpenHandler(() => {
            return { action: "deny" };
        });

        contents.on("will-navigate", (event) => {
            event.preventDefault();
        });

        contents.on("will-attach-webview", (event) => {
            event.preventDefault();
        });
    });
}

const { registrarHistorial } = createAudit({
    getUsuarioActual,
    obtenerFechaLocalSQL
});

function registrarIpcs() {
    if (ipcsRegistrados) return;
    ipcsRegistrados = true;

    registerPeriodosIpc(ipcMain, {
        registrarHistorial,
        obtenerFechaLocalSQL
    });

    registerBackupsIpc(ipcMain, {
        app,
        dbPath,
        dialog,
        registrarHistorial,
        cerrarConexionBaseDeDatos,
        reabrirConexionBaseDeDatos
    });

    registerComprobantesIpc(ipcMain, {
        dialog,
        getMainWindow: () => win
    });

    registerFilesIpc();

    registerEstudiantesIpc(ipcMain, {
        obtenerFechaLocalSQL,
        registrarHistorial,
        registrarHistorialPago,
        registrarComprobantePago,
        getUsuarioActual
    });

    registerPagosIpc(ipcMain, {
        abrirVistaPrevia,
        getMainWindow: () => win
    });

    registerAuditoriaIpc(ipcMain);

    registerAuth(ipcMain, {
        setUsuarioActual,
        getSesionActual,
        clearUsuarioActual,
        createWindow: crearVentanaPrincipalSiNoExiste,
        createLoginWindow: crearVentanaLoginSiNoExiste,
        getMainWindow: () => win,
        getLoginWindow: () => loginWin,
        registrarHistorial
    });

    inicializarIPCUsuarios({
        registrarHistorial
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (haySesionActiva()) {
            if (!enfocarVentana(win)) {
                crearVentanaPrincipalSiNoExiste();
            }
        } else {
            if (!enfocarVentana(loginWin)) {
                crearVentanaLoginSiNoExiste();
            }
        }
    });
}

endurecerWebContentsGlobales();

app.whenReady().then(async () => {
    try {
        conectarBaseDeDatos();
        registrarIpcs();

        await inicializarBaseDeDatos();
        await inicializarPeriodosAcademicos(obtenerFechaLocalSQL);
        await crearRespaldoAutomaticoBaseDeDatos({
            app,
            dbPath
        });

        if (haySesionActiva()) {
            crearVentanaPrincipalSiNoExiste();
        } else {
            crearVentanaLoginSiNoExiste();
        }
    } catch (error) {
        console.error("Error inicializando la aplicación:", error);
        crearVentanaLoginSiNoExiste();
    }
});

app.on("before-quit", () => {
    clearUsuarioActual();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        if (haySesionActiva()) {
            crearVentanaPrincipalSiNoExiste();
        } else {
            crearVentanaLoginSiNoExiste();
        }
    }
});