const { BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");

const APP_CSP = [
    "default-src 'self' data: blob:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
].join("; ");

function aplicarSeguridadVentana(win) {
    if (!win || win.isDestroyed()) return;

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [APP_CSP],
                "X-Content-Type-Options": ["nosniff"],
                "X-Frame-Options": ["DENY"],
                "Referrer-Policy": ["no-referrer"]
            }
        });
    });

    win.webContents.on("will-navigate", (event, url) => {
        const currentUrl = win.webContents.getURL();

        if (url !== currentUrl) {
            event.preventDefault();
        }
    });

    win.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });
}

function createMainWindow({
    ROOT_DIR,
    getOnCargarExcel,
    getOnCrearRespaldo,
    getOnRestaurarRespaldo
}) {
    const win = new BrowserWindow({
        width: 1200,
        height: 1200,
        show: false,
        icon: path.join(ROOT_DIR, "assets/logo2.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            enableRemoteModule: false,
            preload: path.join(ROOT_DIR, "preload.js")
        }
    });

    aplicarSeguridadVentana(win);

    win.loadFile(path.join(ROOT_DIR, "index.html"));

    win.once("ready-to-show", () => {
        if (!win.isDestroyed()) {
            win.maximize();
            win.show();
        }
    });

    const menuTemplate = [
        {
            label: "Archivos",
            submenu: [
                {
                    label: "Crear respaldo",
                    click: async () => {
                        try {
                            const onCrearRespaldo = getOnCrearRespaldo?.();
                            if (typeof onCrearRespaldo === "function") {
                                await onCrearRespaldo(win);
                            }
                        } catch (error) {
                            console.error("Error creando respaldo desde menú:", error);
                            dialog.showErrorBox("Error de respaldo", "Ocurrió un error al crear el respaldo.");
                        }
                    }
                },
                {
                    label: "Restaurar respaldo",
                    click: async () => {
                        try {
                            const onRestaurarRespaldo = getOnRestaurarRespaldo?.();
                            if (typeof onRestaurarRespaldo === "function") {
                                await onRestaurarRespaldo(win);
                            }
                        } catch (error) {
                            console.error("Error restaurando respaldo desde menú:", error);
                            dialog.showErrorBox("Error de restauración", "Ocurrió un error al restaurar el respaldo.");
                        }
                    }
                },
                { type: "separator" },
                { role: "quit", label: "Salir" }
            ]
        },
        {
            label: "Editar",
            submenu: [
                { role: "undo", label: "Deshacer" },
                { role: "redo", label: "Rehacer" },
                { type: "separator" },
                { role: "cut", label: "Cortar" },
                { role: "copy", label: "Copiar" },
                { role: "paste", label: "Pegar" }
            ]
        },
        {
            label: "Ver",
            submenu: [
                { role: "reload", label: "Recargar" }
               // { role: "toggledevtools", label: "Herramientas de desarrollo" }
            ]
        },
        {
            label: "Ayuda",
            submenu: [
                {
                    label: "Acerca de",
                    click: () => {
                        dialog.showMessageBox(win, {
                            type: "info",
                            title: "Sistema de Matrícula Escolar",
                            message: "Sistema de Matrícula Escolar"
                        });
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    return win;
}

function createLoginWindow({ ROOT_DIR }) {
    const loginWin = new BrowserWindow({
        width: 480,
        height: 600,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        show: false,
        autoHideMenuBar: true,
        icon: path.join(ROOT_DIR, "assets/logo2.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            enableRemoteModule: false,
            preload: path.join(ROOT_DIR, "preload.js")
        }
    });

    aplicarSeguridadVentana(loginWin);

    loginWin.setMenu(null);
    loginWin.loadFile(path.join(ROOT_DIR, "login.html"));

    loginWin.once("ready-to-show", () => {
        if (!loginWin.isDestroyed()) {
            loginWin.show();
        }
    });

    return loginWin;
}

module.exports = {
    createMainWindow,
    createLoginWindow
};