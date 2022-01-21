
export default {
  fromClickup: entry => {

    const editable = ['Closed', 'archived'].indexOf(entry.task.status.status) === -1

    return {
      entryId: entry.id,
      taskId: entry.task.id,
      title: entry.task.name,
      description: entry.description,
      start: new Date(Number(entry.start)),
      end: new Date(Number(entry.start) + Number(entry.duration)),

      // Only make draggable/resizable/editable if task is not closed or archived
      draggable: editable,
      resizable: editable,
      deletable: editable,
      class: !editable ? 'not-editable' : null
    }
  }
}
