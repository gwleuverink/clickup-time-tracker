
export default {
    fromClickup: function(entry) {

        if(!entry.task) return false
        if(entry.task === '0') return this.entryWithoutTask(entry);

        const editable = ['Closed', 'archived'].indexOf(entry.task.status.status) === -1

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
            class: !editable ? 'not-editable' : null + ' ' + entry.task_location.space_id ? 'space-' + entry.task_location.space_id : null
        }
    },

    entryWithoutTask: entry => ({
        entryId: entry.id,
        taskId: null,
        title: 'No access to task details',
        taskUrl: false,
        description: entry.description,
        start: new Date(Number(entry.start)),
        end: new Date(Number(entry.start) + Number(entry.duration)),

        // No task is attached. Disable mutations
        draggable: false,
        resizable: false,
        deletable: false,
        class: 'not-editable'
    }),

    updateFromRemote: (original, remote) => {
        return Object.assign(original, {
            entryId: remote.id,
            taskId: remote.task.id,
            taskUrl: `https://app.clickup.com/t/${remote.task.id}`,
            title: remote.task.name,
            description: remote.description,
            start: new Date(Number(remote.start)),
            end: new Date(Number(remote.start) + Number(remote.duration)),
        })
    }
}
