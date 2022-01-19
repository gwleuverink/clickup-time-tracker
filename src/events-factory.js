import moment from 'moment'

export default {
    fromClickup: entry => ({
        title: entry.task.name,
        description: entry.description,
        start: moment(Number(entry.start)).format('YYYY-MM-DD HH:MM'),
        end: moment(Number(entry.start) + Number(entry.duration)).format('YYYY-MM-DD HH:MM')
    })
}
