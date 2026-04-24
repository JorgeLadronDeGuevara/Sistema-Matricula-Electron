// window de comprobante

const { BrowserWindow } = require("electron");
const path = require("path");

let previewWin = null;

const PREVIEW_CSP = [
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

function aplicarSeguridadPreview(win) {
    if (!win || win.isDestroyed()) return;

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [PREVIEW_CSP],
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

    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    win.removeMenu();
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
}

function crearVentanaPreview(parentWindow = null) {
    if (previewWin && !previewWin.isDestroyed()) {
        if (previewWin.isMinimized()) previewWin.restore();
        previewWin.focus();
        return previewWin;
    }

    previewWin = new BrowserWindow({
        width: 1000,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        show: false,
        autoHideMenuBar: true,
        parent: parentWindow || undefined,
        modal: false,
        backgroundColor: "#eef2f7",
        title: "Vista previa del comprobante",
        webPreferences: {
            preload: path.join(__dirname, "../../../preload_preview.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    aplicarSeguridadPreview(previewWin);

    previewWin.loadFile(path.join(__dirname, "../../../preview-comprobante.html"));

    previewWin.once("ready-to-show", () => {
        if (!previewWin || previewWin.isDestroyed()) return;

        previewWin.center();
        previewWin.show();

        // Ajusta un poco la escala para que se vea más completo
        previewWin.webContents.setZoomFactor(0.90);
    });

    previewWin.on("closed", () => {
        previewWin = null;
    });

    return previewWin;
}

function getPreviewWindow() {
    return previewWin;
}

function cerrarPreview() {
    if (previewWin && !previewWin.isDestroyed()) {
        previewWin.close();
        previewWin = null;
    }
}

module.exports = {
    crearVentanaPreview,
    getPreviewWindow,
    cerrarPreview
};