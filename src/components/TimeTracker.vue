<template>

    <!-- START | Calendar view -->
    <!--
        :on-event-create="onTaskCreate"
        :on-event-dblclick="selectEvent"
        :on-event-click="selectEvent"
    -->
    <vue-cal
        :editable-events="{ drag: true, resize: true, create: true }"
        :disable-views="['years', 'year', 'month', 'day']"
        :on-event-create="onTaskCreate"
        :click-to-navigate="false"
        :hide-view-selector="true"
        :watch-real-time="true"
        :snap-to-time="5"
        :events="events"

        @ready="fetchEvents"
        @view-change="fetchEvents"

        active-view="week"
        today-button
        ref="calendar"
    />
    <!-- END | Calendar view -->


    <!-- START | Task creation modal -->
    <n-modal v-model:show="showTaskCreationDialog">
        <n-card
            :bordered="false"
            style="max-width: 600px"
            title="Log a new task"
            size="huge"
            role="dialog"
            aria-modal="true"
        >
            <template #header> Log a new task </template>


            <n-input v-model:value="selectedTask.description" type="textarea" placeholder="Describe what you worked on" />


            <template #footer>
                <div class="flex justify-end space-x-2">
                    <n-button @click="cancelTaskCreation()" round>Cancel</n-button>
                    <n-button @click="createTask()" round type="primary">Create</n-button>
                </div>
            </template>
        </n-card>
    </n-modal>
    <!-- END | Task creation modal -->


</template>


<script>
import { ref } from 'vue'
import { NModal, NCard, NButton, NInput } from 'naive-ui';
import VueCal from 'vue-cal'
import moment from 'moment'

import tasks from '../task-repository'
import task from '../data-transfer/task'
import event from '../data-transfer/event'

import 'vue-cal/dist/drag-and-drop.js'
import 'vue-cal/dist/vuecal.css'

export default {
  components: { VueCal, NModal, NCard, NButton, NInput },

  setup () {

    return {
      events: ref([]),
      selectedTask: ref({}),
      deleteCallable: ref(() => null),
      showTaskCreationDialog: ref(false),
    }
  },

  mounted() {

    //   this.populateCalendarEvents('2022-01-10 07:00', '2022-01-16 23:59')

  },


  methods: {
      async fetchEvents ({ startDate, endDate }) {
          tasks.getRange(moment(startDate), moment(endDate)).then(tasks => {
            this.events = tasks.map(task => event.fromTask(task))
          })
      },

      onTaskCreate (event, deleteCallable) {
            this.selectedTask = event
            this.showTaskCreationDialog = true
            this.deleteCallable = deleteCallable

            return event
        },

        createTask() {
            tasks.create(task.fromCalendar(this.selectedTask))
                .catch(() => {
                    alert('Failed to create task')
                    this.cancelTaskCreation()
                })
                .then(this.closeCreationDialog())
        },

        cancelTaskCreation () {
            this.closeCreationDialog()
            this.deleteCallable()
        },

        closeCreationDialog () {
            this.showTaskCreationDialog = false
            this.selectedTask = {}
        },
  }
}
</script>


<style>
.vuecal__event {
    background-color: rgba(173, 216, 230, 0.5);
    border-bottom: .5px solid rgba(173, 216, 230, 0.8);
}
</style>
