const { getDb } = require("./connection");

function dbGet(sql, params = []) {
    const db = getDb();

    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(row || null);
        });
    });
}

function dbAll(sql, params = []) {
    const db = getDb();

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows || []);
        });
    });
}

function dbRun(sql, params = []) {
    const db = getDb();

    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
                return;
            }

            resolve(this);
        });
    });
}

async function runInTransaction(callback) {
    if (typeof callback !== "function") {
        throw new Error("Callback de transacción inválido.");
    }

    await dbRun("BEGIN TRANSACTION");

    try {
        const result = await callback({
            dbGet,
            dbAll,
            dbRun
        });

        await dbRun("COMMIT");
        return result;
    } catch (error) {
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackError) {
            console.error("Error haciendo rollback:", rollbackError);
        }

        throw error;
    }
}

module.exports = {
    dbGet,
    dbAll,
    dbRun,
    runInTransaction
};