import database from './database';
import task from './data-transfer/task';

export default {
    async getRange(start, end) {

        const db = database.open();
        const query = `
            SELECT * FROM tasks
            WHERE starts_at >= ?
            AND ends_at <= ?
            ORDER BY starts_at ASC
        `;

        return await new Promise((resolve, reject) => {
           db.all(query, [start.valueOf(), end.valueOf()], (err, rows) => {

                if (err) {
                    reject(err);
                }

                resolve(rows.map(row => task.fromDatabase(row)));
                db.close();
            })
        })
    },

    async create(data) {

        const db = database.open();
        const query = `
            INSERT INTO tasks (service_id, description, logged, starts_at, ends_at)
            VALUES ($service_id, $description, $logged, $starts_at, $ends_at)
        `;

        return await new Promise ((resolve, reject) => {
            db.run(query, {
                $service_id: data.service_id,
                $description: data.description,
                $starts_at: data.starts_at.valueOf(),
                $ends_at: data.ends_at.valueOf(),
                $logged: false,
            }, (err, rows) => {

                if (err) {
                    reject(err);
                }

                resolve(rows)
                db.close();
            })
        })

    },

    // update(id, data) {

    // },

    // delete(id) {
    //     db.run(`
    //         DELETE FROM tasks
    //         WHERE id = ?
    //     `,
    //         [id], err => console.error(err)
    //     )
    // },

    // markAsLogged(id) {
    //     db.run(`
    //         UPDATE tasks
    //         SET logged = true
    //         WHERE id = ?
    //     `,
    //         [id], err => console.dir(err)
    //     )
    // }
}
