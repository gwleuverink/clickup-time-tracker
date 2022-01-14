export default {
    fromTask(task) {
        return {
            id: task.id,
            description: task.description,
            start: task.starts_at.format('YYYY-MM-DD HH:MM'),
            end: task.ends_at.format('YYYY-MM-DD HH:MM'),

            draggable: !task.logged,
            resizable: !task.logged,
            deletable: !task.logged,
        }
    }
}
