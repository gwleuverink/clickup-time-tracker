<template>

    <!-- START | Calendar view -->
    <!--
        :on-event-create="onEventCreate"
        :on-event-dblclick="selectEvent"
        :on-event-click="selectEvent"
    -->
    <vue-cal
        :editable-events="{ drag: true, resize: true, create: true }"
        :disable-views="['years', 'year', 'month', 'day']"
        :on-event-create="onEventCreate"
        :click-to-navigate="false"
        :hide-view-selector="true"
        :watch-real-time="true"
        :snap-to-time="5"
        :events="events"
        active-view="week"
        today-button
    />
    <!-- END | Calendar view -->


    <!-- START | Task creation modal -->
    <n-modal v-model:show="showEventCreationDialog">
        <n-card
            :bordered="false"
            style="max-width: 600px"
            title="Log a new task"
            size="huge"
            role="dialog"
            aria-modal="true"
        >
            <template #header> Log a new task </template>


            <n-input v-model:value="selectedEvent.contentFull" type="textarea" placeholder="Describe what you worked on" />


            <template #footer>
                <div class="flex justify-end space-x-2">
                    <n-button @click="cancelEventCreation()" round>Cancel</n-button>
                    <n-button @click="closeCreationDialog()" round type="primary">Create</n-button>
                </div>
            </template>
        </n-card>
    </n-modal>
    <!-- END | Task creation modal -->


</template>


<script>
// In your Vue.js component.
import { ref } from 'vue'
import VueCal from 'vue-cal'
import { NModal, NCard, NButton, NInput } from 'naive-ui';
import 'vue-cal/dist/drag-and-drop.js'
import 'vue-cal/dist/vuecal.css'
import db from '../database'

export default {
  components: { VueCal, NModal, NCard, NButton, NInput },

  setup () {
      db
    return {
      selectedEvent: ref({}),
      deleteCallable: ref(() => null),
      showEventCreationDialog: ref(false),

      events: [
          {
            start: '2022-01-10 14:00',
            end: '2022-01-10 18:00',
            title: 'Editable',
            contentFull: 'Click to see my shopping list',
         },
          {
            start: '2022-01-10 18:00',
            end: '2022-01-10 19:00',
            title: 'Not Editable',
            contentFull: 'Click to see my shopping list',
            deletable: false,
            resizable: false,
            draggable: false
         },
      ]
    }
  },


  methods: {
      onEventCreate (event, deleteCallable) {
            this.selectedEvent = event
            this.showEventCreationDialog = true
            this.deleteCallable = deleteCallable

            return event
        },

        cancelEventCreation () {
            this.closeCreationDialog()
            this.deleteCallable()
        },

        closeCreationDialog () {
            this.showEventCreationDialog = false
            this.selectedEvent = {}
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
