
export default {
    fromClickup: entry => {

        if(!entry.task) return false

        const editable = ['Closed', 'archived'].indexOf(entry.task.status.status) === -1
        console.dir(entry);
        return {
            entryId: entry.id,
            taskId: entry.task.id,
            title: entry.task.name,
            taskUrl: entry.task_url,
            description: entry.description,
            start: new Date(Number(entry.start)),
            end: new Date(Number(entry.start) + Number(entry.duration)),

            // Only make draggable/resizable/editable if task is not closed or archived
            draggable: editable,
            resizable: editable,
            deletable: editable,
            class: !editable ? 'not-editable' : null
        }
    },

    updateFromRemote: (original, remote) => {
        return Object.assign(original, {
            entryId: remote.id,
            taskId: remote.task.id,
            title: remote.task.name,
            taskUrl: remote.task_url,
        })
    }
}
