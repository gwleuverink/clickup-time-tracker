<template>
  <!-- START | Calendar view -->
  <vue-cal
    :editable-events="{ drag: true, resize: true, create: true }"
    :disable-views="['years', 'year', 'month', 'day']"
    :on-event-create="onTaskCreate"
    :drag-to-create-threshold="30"
    :click-to-navigate="false"
    :hide-view-selector="true"
    :watch-real-time="true"
    :time-from="7 * 60"
    :time-to="22 * 60"
    :snap-to-time="15"
    :events="events"
    @ready="fetchEvents"
    @view-change="fetchEvents"
    @event-drop="updateEventTime"
    @event-duration-change="updateEventTime"
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

      <n-space vertical>

        <div style="display: flex; align-items: center">
            <n-select
              filterable
              :options="clickupCards"
              :disabled="loadingClickupCards"
              v-model:value="selectedTask.taskId"
              :placeholder="loadingClickupCards ? 'Refreshing Card list' : 'Please Select card to start tracking'"
            />

          <n-button
            strong secondary circle
            @click="refreshClickupCards()"
            :disabled="loadingClickupCards"
            style="border:none; background: none"
          >
            <n-icon name="refresh" size="20" :class="{ 'rotate': loadingClickupCards }">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </n-icon>

          </n-button>
        </div>

        <n-input
          type="textarea"
          v-model:value="selectedTask.description"
          placeholder="Describe what you worked on"
        />

      </n-space>

      <template #footer>
        <div style="display: flex; justify-content: flex-end;">
          <n-button @click="cancelTaskCreation()" round>Cancel</n-button> &nbsp;
          <n-button @click="createTask()" round type="primary">Create</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
  <!-- END | Task creation modal -->
</template>


<script>
import { ref } from "vue";
import { ipcRenderer } from 'electron'
import { NModal, NCard, NSpace, NIcon, NButton, NInput, NSelect } from "naive-ui";
import VueCal from "vue-cal";

import clickupService from '../clickup-service'
import eventFactory from '../events-factory'

import "vue-cal/dist/drag-and-drop.js";
import "vue-cal/dist/vuecal.css";

export default {
  components: { VueCal, NModal, NCard, NSpace, NIcon, NButton, NInput, NSelect },

  setup() {
    return {
      events: ref([]),
      selectedTask: ref({}),

      clickupCards: ref([]),
      loadingClickupCards: ref(false),

      deleteCallable: ref(() => null),
      showTaskCreationDialog: ref(false),
    };
  },

  mounted() {
      // Register background process listeners
      ipcRenderer.on('set-clickup-cards', (event, cards) => this.onClickupCardsRefreshed(cards))

      this.refreshClickupCards()
  },

  methods: {

    /*
    |--------------------------------------------------------------------------
    | FETCH TIME TRACKING ENTRIES
    |--------------------------------------------------------------------------
    */

    async fetchEvents({ startDate, endDate }) {
      clickupService.getTimeTrackingRange(startDate, endDate)
        .then(entries => this.events = entries.map(entry => eventFactory.fromClickup(entry)))
        .catch(error => alert(error) /* TODO: Show pretty toast */)
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */

    // Instruct background process to refresh clickup cards
    refreshClickupCards() {
      this.loadingClickupCards = true
      ipcRenderer.send('get-clickup-cards')

      console.info('Refreshing Clickup cards...')
    },

    // Fired when background process sends us the refreshed cards
    onClickupCardsRefreshed(cards) {

      this.clickupCards = cards.map(card => ({
        'value': card.id,
        'label': card.name
      }))

      this.loadingClickupCards = false

      console.info('Clickup cards refreshed!')
    },

    /*
    |--------------------------------------------------------------------------
    | CREATE A TASK
    |--------------------------------------------------------------------------
    */
    onTaskCreate(event, deleteCallable) {
      this.selectedTask = event;
      this.showTaskCreationDialog = true;
      this.deleteCallable = deleteCallable;

      return this.selectedTask;
    },

    createTask() {
        clickupService.createTimeTrackingEntry(
            this.selectedTask.taskId,
            this.selectedTask.description,
            this.selectedTask.start,
            this.selectedTask.end
        )
        .then(entry => {
            console.info(`Created time tracking entry for: ${entry.task.name}`)

            this.selectedTask = Object.assign(this.selectedTask, {
                entryId: entry.id,
                taskId: entry.task.id,
                title: entry.task.name,
            })
            this.closeCreationDialog()
        })
        .catch(error => {
            alert(error) /* TODO: Show pretty toast */
            this.cancelTaskCreation()
        })
    },

    cancelTaskCreation() {
      this.closeCreationDialog();
      this.deleteCallable();
    },

    closeCreationDialog() {
      this.showTaskCreationDialog = false;
      this.selectedTask = {};
    },

    /*
    |--------------------------------------------------------------------------
    | UPDATE A TASK
    |--------------------------------------------------------------------------
    */

    async updateEventTime({ event, originalEvent }) {

        clickupService.updateTimeTrackingEntry(
            event.entryId,
            event.description,
            event.start,
            event.end
        )
        .then(entry => console.dir(`Updated time tracking entry for: ${entry.task.name}`))
        .catch(error => {
            console.error(error)
            alert('Something went wrong updating the tracking entry. Please refresh') /* TODO: Show pretty toast */
            // TODO: Reset event to what it was before failed update
        })

      originalEvent /*  */
    },
  },
};
</script>


<style lang="css">
.vuecal__event {
  /* user-select: none; */
  background-color: rgba(173, 216, 230, 0.5);
  border-bottom: 0.5px solid rgba(173, 216, 230, 0.8);
}

.vuecal__event.not-editable {
  background-color: #F0441D;
  color: #FABEB0;
}

.vuecal__event-title {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 .4em;
}

.rotate {
  animation: rotation 1s infinite linear;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-359deg);
  }
}
</style>
