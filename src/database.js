// Wherever you use the database
import path from 'path'
const sqlite3 = require('sqlite3').verbose();
const isBuild = process.env.NODE_ENV === 'production'

const database = {

    /* global __static */
    path: path.join(
        isBuild ? __dirname : __static,
        '../database.sqlite',
    ),

    open() {
        return new sqlite3.Database(this.path);
    }
}

export default database;

export function migrateDatabase() {
    const db = database.open();

    db.serialize(function() {
      db.run(`CREATE TABLE if not exists tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id VARCHAR(85) NULL,
        description VARCHAR(255) NULL,
        logged BOOLEAN NOT NULL DEFAULT FALSE,
        starts_at DATETIME NOT NULL,
        ends_at DATETIME NOT NULL
      )`);
    });

    db.close();
}
