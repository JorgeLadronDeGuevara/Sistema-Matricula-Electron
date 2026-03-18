// main.js
const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");

// Declarar la ventana globalmente
let win;

// Crear base de datos SQLite
const dbPath = path.join(app.getPath("userData"), 'database.db');
console.log("Base de datos en:", dbPath);
const db = new sqlite3.Database(dbPath);

 app.on("web-contents-created",(event,contents)=>{

  contents.setWindowOpenHandler(()=>{
    return {action:"deny"}
  })

})

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });
}

// Crear tabla con cedula UNIQUE para evitar duplicados
db.serialize(() => {

     db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO usuarios (usuario,password)
        VALUES ('admin','admin123')`);

    db.run(`CREATE TABLE IF NOT EXISTS estudiantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cedula TEXT UNIQUE,
        apellidos TEXT,
        nombres TEXT,
        sexo TEXT,
        correo TEXT,
        pagado REAL,
        seguro REAL,
        grado TEXT,
        cit TEXT,
        hermano TEXT,
        estado_pago TEXT,
        estado_estudiante TEXT DEFAULT 'activo'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cedula ON estudiantes(cedula)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_nombres ON estudiantes(nombres)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_grado ON estudiantes(grado)`);
});

function createWindow() {
    if (win) return;
    win = new BrowserWindow({
        width: 1200,
        height: 1200,
        icon: path.join(__dirname, "assets/logo2.ico"), 
         webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.loadFile('index.html');

    win.on('closed', () => {
        win = null;
    });

    // Bloquear navegación externa
    win.webContents.on("will-navigate", (event, url) => {
        if(url !== win.webContents.getURL()){
            event.preventDefault();
        }
    });
    win.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
});

// Bloquear contenido remoto
win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      ]
    }
  });
});

    // Maximizar al iniciar, sin perder menú ni barra de tareas
    win.maximize();

    // Crear menú
    const menuTemplate = [
        {
            label: 'Archivos',
            submenu: [
                {
                    label: 'Cargar Excel',
                    click: async () => {
                        try {
                            // Abrir diálogo de archivos
                            const { canceled, filePaths } = await dialog.showOpenDialog({
                                properties: ['openFile'],
                                filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
                            });

                            if (!canceled && filePaths.length > 0) {
                                // Enviar ruta al renderer
                                win.webContents.send('cargar-excel', filePaths[0]);
                            }
                        } catch (err) {
                            console.error("Error al cargar el Excel:", err);
                        }
                    }
                },
                {
                    label: 'Reportes',
                    submenu: [
                        {
                            label: 'Reportes PDF',
                            submenu: [
                                {
                                    label:'Todos los estudiantes' ,
                                    click: () =>{        
                                        win.webContents.send('exportar-pdf');
                                    }
                                },
                                {
                                    label:'Exportar lista de cancelados' ,
                                    click: () =>{
                                        win.webContents.send('exportar-pdf-cancelados');
                                    }
                                },
                                {
                                    label:'Exportar lista de deudores' ,
                                    click: () =>{
                                         win.webContents.send('exportar-pdf-deudores');
                                    }
                                },
                                 {
                                    label:'Exportar lista de abonos' ,
                                    click: () =>{        
                                        win.webContents.send('exportar-pdf-abonados');

                                    }
                                },

                            ]
                        },
                        {
                            label:'Reporte Excel',
                            click: () => win.webContents.send("exportar-excel-completo")
                        }
                    ]
                },
                
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
        label: 'Editar',
        submenu: [
            { role: 'undo', label: 'Deshacer' },
            { role: 'redo', label: 'Rehacer' },
            { type: 'separator' },
            { role: 'cut', label: 'Cortar' },
            { role: 'copy', label: 'Copiar' },
            { role: 'paste', label: 'Pegar' }
        ]
    },
        {
        label: 'Ver',
        submenu: [
            { role: 'reload', label: 'Recargar' },
           // { role: 'toggledevtools', label: 'Herramientas de desarrollo' }
        ]
    },
        {
        label: 'Ayuda',
        submenu: [
            {
                label: 'Acerca de',
                click: () => {
                    dialog.showMessageBox({ message: "Sistema de Matrícula Escolar" });
                }
            }
        ]
    }
    ];
    
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
    //const menu = Menu.buildFromTemplate(menuTemplate);
    //Menu.setApplicationMenu(menu);
}

let loginWin;

function createLoginWindow(){

    loginWin = new BrowserWindow({
    width: 430,
    height: 380,
    resizable:false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets/logo2.ico"), // 👈 AQUI VA EL ICONO
    webPreferences:{
        nodeIntegration:false,
        contextIsolation:true,
        preload: path.join(__dirname,"preload.js")
    }
});

loginWin.setMenu(null);

    loginWin.loadFile("login.html");

}

ipcMain.handle("login",(event,usuario,password)=>{

    return new Promise((resolve)=>{

        db.get(`SELECT * FROM usuarios WHERE usuario=? AND password=?`,
        [usuario,password],
        (err,row)=>{

            if(err || !row){

    resolve({success:false});
    return;

}

// cerrar login
if(loginWin){
    loginWin.close();
}

// abrir ventana principal
if (win) {
    win.focus();
} else {
    createWindow();
}

resolve({success:true});
        });

    });

});

// Insertar estudiante individual
ipcMain.on('insertar-estudiante', (event, est) => {

    if(!est || typeof est !== "object"){
        console.error("Objeto estudiante inválido");
        return;
    }

    const cedulaRegex = /^\d+-\d+-\d+$/;    
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!cedulaRegex.test(est.cedula)){
        console.error("Cédula inválida");
        return;
    }

    if(typeof est.nombres !== "string" || est.nombres.length < 2){
        console.error("Nombre inválido");
        return;
    }

    if(est.correo && !correoRegex.test(est.correo)){
        console.error("Correo inválido");
        return;
    }

    if(typeof est.grado !== "string" || est.grado.length < 1){
        console.error("Grado inválido");
        return;
    }
    const stmt = db.prepare(`INSERT OR IGNORE INTO estudiantes
        (cedula, apellidos, nombres, sexo, correo, pagado, seguro, grado, cit, hermano, estado_pago)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
    est.cedula, est.apellidos, est.nombres, est.sexo, est.correo,
    est.pagado, est.seguro, est.grado, est.cit, est.hermano, est.estado_pago,
    function(err){

        if(err){
            console.error("Error al insertar:", err);
            event.reply("error-insertar","Error al insertar estudiante");
            return;
        }

        if(this.changes === 0){
            event.reply("error-insertar","La cédula ya existe");
            return;
        }

        event.reply('estudiante-insertado', this.lastID);
    }
);
    stmt.finalize();
});

ipcMain.on('actualizar-estudiante', (event, est) => {

  if(!est || typeof est !== "object") return;

  if(!Number.isInteger(est.id)) return;

  if(typeof est.correo !== "string") return;

  if(typeof est.grado !== "string" || est.grado.length < 1) return;

  if(typeof est.pagado !== "number" || est.pagado < 0) return;

  if(typeof est.seguro !== "number" || est.seguro < 0) return;

  const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if(est.correo && !correoRegex.test(est.correo)) return;

  const sql = `
  UPDATE estudiantes
  SET correo = ?, pagado = ?, seguro = ?, grado = ?, cit = ?, hermano = ?, estado_pago = ?
  WHERE id = ?
  `;

  db.run(sql,[
    est.correo,
    est.pagado,
    est.seguro,
    est.grado,
    est.cit,
    est.hermano,
    est.estado_pago,
    est.id
  ], function(err){

    if(err){
      console.error("Error al actualizar estudiante:",err);
      return;
    }

    event.reply('estudiante-actualizado');

  });

});

// Insertar muchos estudiantes de Excel
ipcMain.on('insertar-muchos-estudiantes', (event, estudiantes) => {
    
    if(!Array.isArray(estudiantes)){
        console.error("Datos inválidos");
        return;
    }
    db.serialize(() => {
        const stmt = db.prepare(`INSERT OR IGNORE INTO estudiantes
            (cedula, apellidos, nombres, sexo, correo, pagado, seguro, grado, cit, hermano, estado_pago)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        estudiantes.forEach(est => {
            stmt.run(est.cedula, est.apellidos, est.nombres, est.sexo, est.correo,
                     est.pagado, est.seguro, est.grado, est.cit, est.hermano, est.estado_pago,function(err){
        if(err){
            console.error("Error insertando estudiante:", err);
        }
    });
        });
        stmt.finalize(() => event.reply('estudiantes-insertados'));
    });
});

// Traer todos los estudiantes
ipcMain.on('traer-estudiantes', (event) => {
db.all(`
        SELECT * FROM estudiantes 
        WHERE estado_estudiante = 'activo'
        ORDER BY id ASC
    `, [], (err, rows) => {        
        console.log("Estudiantes en DB:", rows.length);
        event.reply('resultados-busqueda', rows);
    });
});

// Buscar estudiantes por SQL
ipcMain.on('buscar-estudiantes', (event, termino) => {
    
    if (typeof termino !== "string") {
        termino = "";
    }

    // 🔥 NORMALIZAR AQUÍ (BACKEND)
    const terminoNormalizado = termino
        .replace(/[-°\s]/g, "") // quita -, espacios y °
        .toUpperCase();

    const like = `%${terminoNormalizado}%`;

    db.all(`
        SELECT * FROM estudiantes 
        WHERE estado_estudiante = 'activo'
        AND (
            UPPER(nombres) LIKE ?
            OR UPPER(apellidos) LIKE ?
            OR cedula LIKE ?
            OR UPPER(
                REPLACE(
                    REPLACE(
                        REPLACE(grado, '-', ''), 
                    '°', ''), 
                ' ', '')
            ) LIKE ?
        )
        ORDER BY id ASC
    `,
    [like, like, like, like],
    (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            event.reply('resultados-busqueda', rows);
        }
    });
});

ipcMain.handle("eliminar-estudiante", (event, id) => {

    return new Promise((resolve, reject) => {

        if(!Number.isInteger(id)){
            resolve({success:false});
            return;
        }

        db.run(`
            UPDATE estudiantes
            SET estado_estudiante = 'eliminado'
            WHERE id = ?
        `,[id], function(err){

            if(err){
                console.error("Error al eliminar:", err);
                resolve({success:false});
                return;
            }

            resolve({success:true});
        });

    });

});

ipcMain.on("recuperar-estudiante", (event, id) => {

    if(!Number.isInteger(id)) return;

    db.run(`
        UPDATE estudiantes
        SET estado_estudiante = 'activo'
        WHERE id = ?
    `,[id], function(err){

        if(err){
            console.error("Error al recuperar:", err);
            return;
        }

        event.reply("estudiante-recuperado");
    });

});

ipcMain.on("traer-eliminados", (event) => {

    db.all(`
        SELECT * FROM estudiantes
        WHERE estado_estudiante = 'eliminado'
        ORDER BY id ASC
    `,[],(err,rows)=>{

        if(err){
            console.error(err);
            return;
        }

        event.reply("lista-eliminados",rows);
    });

});


ipcMain.handle("guardar-archivo", async (event, opciones) => {

    const { canceled, filePath } = await dialog.showSaveDialog(opciones);

    if (canceled) return null;

    return filePath;

});

ipcMain.handle("leer-archivo", (event, ruta) => {

    if(!ruta || typeof ruta !== "string"){
        throw new Error("Ruta inválida");
    }

    const rutaNormalizada = path.normalize(ruta);

    if(!fs.existsSync(rutaNormalizada)){
        throw new Error("Archivo no existe");
    }

    const stats = fs.statSync(rutaNormalizada);

    const MAX_SIZE = 10 * 1024 * 1024;

    if(stats.size > MAX_SIZE){
    throw new Error("Archivo demasiado grande (máx 10MB)");
    }

    const extension = path.extname(rutaNormalizada).toLowerCase();

    if(![".xlsx", ".xls"].includes(extension)){
        throw new Error("Formato de archivo no permitido");
    }

    return fs.readFileSync(rutaNormalizada);

});

ipcMain.handle("escribir-archivo", (event, {ruta, data}) => {

    if(!ruta || typeof ruta !== "string"){
        throw new Error("Ruta inválida");
    }

    if(!data){
        throw new Error("Datos vacíos");
    }

    if(!Buffer.isBuffer(data) && !(data instanceof ArrayBuffer)){
        throw new Error("Formato de datos inválido");
    }

    const buffer = Buffer.from(data);

    fs.writeFileSync(ruta, buffer);
});

app.whenReady().then(createLoginWindow);
app.on('window-all-closed', () => { if(process.platform!=='darwin') app.quit(); });
app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createLoginWindow(); });