// Wherever you use the database
import path from 'path'

const isBuild = process.env.NODE_ENV === 'production'

/* global __static */
const pathToDbFile = path.join(
    isBuild ? __dirname : __static,
    '../database.sqlite',
  );

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(pathToDbFile);

export function migrateDatabase() {
    db.serialize(function() {
      db.run(`CREATE TABLE if not exists logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id VARCHAR(85) NULL,
        description VARCHAR(255) NULL,
        logged BOOLEAN NOT NULL DEFAULT FALSE,
        start DATETIME NOT NULL,
        end DATETIME NOT NULL
      )`);
    });

    db.close();
}


export default db;
