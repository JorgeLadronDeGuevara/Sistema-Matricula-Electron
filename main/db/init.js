const bcrypt = require("bcryptjs");
const { getDb } = require("./connection");

function inicializarBaseDeDatos() {
    const db = getDb();

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    nombre_completo TEXT NOT NULL,
                    rol TEXT NOT NULL DEFAULT 'usuario'
                        CHECK (rol IN ('admin', 'usuario')),
                    activo INTEGER NOT NULL DEFAULT 1
                        CHECK (activo IN (0, 1)),
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS periodos_academicos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    fecha_inicio TEXT,
                    fecha_fin TEXT,
                    estado TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'cerrado')),
                    created_at TEXT NOT NULL
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS configuracion (
                    clave TEXT PRIMARY KEY,
                    valor TEXT
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS alumnos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cedula TEXT NOT NULL UNIQUE,
                    apellidos TEXT NOT NULL,
                    nombres TEXT NOT NULL,
                    sexo TEXT DEFAULT ''
                        CHECK (sexo IN ('', 'M', 'F')),
                    correo TEXT DEFAULT '',
                    estado_alumno TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado_alumno IN ('activo', 'inactivo', 'egresado')),
                    created_at TEXT NOT NULL,
                    updated_at TEXT
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS matriculas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alumno_id INTEGER NOT NULL,
                    periodo_id INTEGER NOT NULL,

                    grado TEXT NOT NULL,
                    cti TEXT NOT NULL DEFAULT ''
                        CHECK (cti IN ('', 'Si', 'No')),
                    hermano TEXT NOT NULL DEFAULT ''
                        CHECK (hermano IN ('', 'Si', 'No')),
                    grupo_familiar TEXT,
                    descuento_hermano TEXT NOT NULL DEFAULT 'No'
                        CHECK (descuento_hermano IN ('Si', 'No')),

                    pagado REAL NOT NULL DEFAULT 0 CHECK (pagado >= 0),
                    seguro REAL NOT NULL DEFAULT 0 CHECK (seguro >= 0),
                    pagado_donacion REAL NOT NULL DEFAULT 0 CHECK (pagado_donacion >= 0),
                    pagado_informatica REAL NOT NULL DEFAULT 0 CHECK (pagado_informatica >= 0),
                    pagado_carnet REAL NOT NULL DEFAULT 0 CHECK (pagado_carnet >= 0),
                    pagado_odontologia REAL NOT NULL DEFAULT 0 CHECK (pagado_odontologia >= 0),
                    pagado_seguro REAL NOT NULL DEFAULT 0 CHECK (pagado_seguro >= 0),

                    estado_pago TEXT NOT NULL DEFAULT 'Pendiente'
                        CHECK (estado_pago IN ('Pendiente', 'Abonado', 'Cancelado')),
                    estado_matricula TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado_matricula IN ('activo', 'eliminado')),
                    promocion TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (promocion IN ('pendiente', 'promovido', 'no_promovido', 'egresado')),
                    observaciones TEXT NOT NULL DEFAULT '',

                    created_at TEXT NOT NULL,
                    updated_at TEXT,

                    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                    FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                    UNIQUE (alumno_id, periodo_id)
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS historial (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario TEXT,
                    accion TEXT,
                    descripcion TEXT,
                    fecha TEXT
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS historial_pagos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    matricula_id INTEGER NOT NULL,
                    alumno_id INTEGER NOT NULL,
                    cedula TEXT DEFAULT '',
                    nombres TEXT DEFAULT '',
                    apellidos TEXT DEFAULT '',
                    grado TEXT DEFAULT '',
                    numero_comprobante TEXT DEFAULT '',
                    monto_donacion REAL NOT NULL DEFAULT 0 CHECK (monto_donacion >= 0),
                    monto_informatica REAL NOT NULL DEFAULT 0 CHECK (monto_informatica >= 0),
                    monto_carnet REAL NOT NULL DEFAULT 0 CHECK (monto_carnet >= 0),
                    monto_odontologia REAL NOT NULL DEFAULT 0 CHECK (monto_odontologia >= 0),
                    monto_seguro REAL NOT NULL DEFAULT 0 CHECK (monto_seguro >= 0),
                    monto_matricula REAL NOT NULL DEFAULT 0 CHECK (monto_matricula >= 0),
                    monto_total REAL NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
                    usuario TEXT DEFAULT '',
                    fecha TEXT,
                    FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT ON UPDATE CASCADE
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS comprobantes_pago (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_comprobante TEXT UNIQUE,
                    matricula_id INTEGER NOT NULL,
                    alumno_id INTEGER NOT NULL,
                    cedula TEXT DEFAULT '',
                    nombres TEXT DEFAULT '',
                    apellidos TEXT DEFAULT '',
                    grado TEXT DEFAULT '',
                    monto_donacion REAL NOT NULL DEFAULT 0 CHECK (monto_donacion >= 0),
                    monto_informatica REAL NOT NULL DEFAULT 0 CHECK (monto_informatica >= 0),
                    monto_carnet REAL NOT NULL DEFAULT 0 CHECK (monto_carnet >= 0),
                    monto_odontologia REAL NOT NULL DEFAULT 0 CHECK (monto_odontologia >= 0),
                    monto_seguro REAL NOT NULL DEFAULT 0 CHECK (monto_seguro >= 0),
                    monto_matricula REAL NOT NULL DEFAULT 0 CHECK (monto_matricula >= 0),
                    monto_total REAL NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
                    usuario TEXT DEFAULT '',
                    fecha TEXT,
                    FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE RESTRICT ON UPDATE CASCADE
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            // Índices alumnos
            db.run(`CREATE INDEX IF NOT EXISTS idx_alumnos_cedula ON alumnos(cedula)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_alumnos_nombres ON alumnos(nombres)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_alumnos_apellidos ON alumnos(apellidos)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_alumnos_estado ON alumnos(estado_alumno)`, manejarErrorIndice);

            // Índices matrículas
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_periodo_id ON matriculas(periodo_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_alumno_id ON matriculas(alumno_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_grado ON matriculas(grado)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_estado ON matriculas(estado_matricula)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_estado_pago ON matriculas(estado_pago)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_grupo_familiar ON matriculas(grupo_familiar)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_periodo_estado ON matriculas(periodo_id, estado_matricula)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_matriculas_periodo_pago ON matriculas(periodo_id, estado_pago)`, manejarErrorIndice);

            // Índices historial
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial(fecha)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial(accion)`, manejarErrorIndice);

            // Índices historial pagos
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_pagos_matricula_id ON historial_pagos(matricula_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_pagos_alumno_id ON historial_pagos(alumno_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_pagos_comprobante ON historial_pagos(numero_comprobante)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_historial_pagos_fecha ON historial_pagos(fecha)`, manejarErrorIndice);

            // Índices comprobantes
            db.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_matricula_id ON comprobantes_pago(matricula_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_alumno_id ON comprobantes_pago(alumno_id)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_numero ON comprobantes_pago(numero_comprobante)`, manejarErrorIndice);
            db.run(`CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_fecha ON comprobantes_pago(fecha)`, manejarErrorIndice);

            const adminUsuario = process.env.ADMIN_USER || "demo";
            const adminPasswordPlano = process.env.ADMIN_PASSWORD || "demo123"; // Solo para demo/portafolio

            const adminNombre = "Administrador del sistema";
            const adminRol = "admin";
            const ahora = new Date().toISOString();

            db.get(`SELECT * FROM usuarios WHERE usuario = ?`, [adminUsuario], async (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row) {
                    resolve();
                    return;
                }

                try {
                    const hash = await bcrypt.hash(adminPasswordPlano, 10);

                    db.run(
                        `INSERT INTO usuarios (
                            usuario,
                            password,
                            nombre_completo,
                            rol,
                            activo,
                            created_at,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            adminUsuario,
                            hash,
                            adminNombre,
                            adminRol,
                            1,
                            ahora,
                            ahora
                        ],
                        (insertErr) => {
                            if (insertErr) {
                                reject(insertErr);
                                return;
                            }

                            console.log("Usuario admin creado correctamente.");
                            resolve();
                        }
                    );
                } catch (hashErr) {
                    reject(hashErr);
                }
            });
        });

        function manejarErrorIndice(err) {
            if (err) {
                reject(err);
            }
        }
    });
}

module.exports = {
    inicializarBaseDeDatos
};