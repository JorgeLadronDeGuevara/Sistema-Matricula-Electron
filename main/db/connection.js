const sqlite3 = require("sqlite3").verbose();

let db = null;

function connect(dbPath) {
    if (db) return db;

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error abriendo la base de datos:", err);
            return;
        }

        db.run("PRAGMA foreign_keys = ON", (pragmaErr) => {
            if (pragmaErr) {
                console.error("Error activando foreign_keys:", pragmaErr);
            }
        });
    });

    return db;
}

function getDb() {
    if (!db) {
        throw new Error("La base de datos no ha sido inicializada.");
    }
    return db;
}

function setDb(newDb) {
    db = newDb;
}

module.exports = {
    connect,
    getDb,
    setDb
};