import moment from 'moment';

export default {
    fromCalendar(data) {
        return {
            id: data.id,
            service_id: 'foo',
            description: data.description,
            logged: data.logged,
            starts_at: moment(data.start),
            ends_at: moment(data.end),
        }
    },

    fromDatabase(row) {
        return {
            id: row.id,
            service_id:row.service_id,
            description: row.description,
            logged: row.logged,
            starts_at: moment(row.starts_at),
            ends_at: moment(row.ends_at),
        }
    }
}
