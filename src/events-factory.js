import clickupService from "@/clickup-service";

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
            spaceId: entry.task_location.space_id,
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


    updateFromRemote: async (original, remote) => {
        // the original entry is the one that is already in the calendar i.e. the selectedtask
        // the remote entry is the one that is returned from the clickup api

        // Take note: from the console.log of the remote object, it seems there is a  task_location object. This in the
        // first function used to determine the class of the entry. But it seems that this object is empty. Don't know
        // why. Therefore i have to get the space id from an api call.
        if (!remote.class) {
            let space_id = await clickupService.getSpaceIdFromTask(remote.task.id)
            remote.class = 'space-' + space_id
        }
        return Object.assign(original, {
            entryId: remote.id,
            taskId: remote.task.id,
            taskUrl: `https://app.clickup.com/t/${remote.task.id}`,
            title: remote.task.name,
            description: remote.description,
            start: new Date(Number(remote.start)),
            end: new Date(Number(remote.start) + Number(remote.duration)),
            class: remote.class
        })
    }
}
