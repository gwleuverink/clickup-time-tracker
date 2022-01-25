<template>
  <!-- START | Calendar view -->
  <vue-cal
    :editable-events="{ drag: true, resize: true, create: true }"
    :disable-views="['years', 'year', 'month', 'day']"
    :on-event-create="onTaskCreate"
    :on-event-click="onTaskSingleClick"
    :on-event-dblclick="onTaskDoubleClick"
    :drag-to-create-threshold="30"
    :click-to-navigate="false"
    :hide-view-selector="true"
    :watch-real-time="true"
    :time-cell-height="80"
    :time-from="7 * 60"
    :time-to="22 * 60"
    :snap-to-time="15"
    :events="events"
    @ready="fetchEvents"
    @view-change="fetchEvents"
    @event-drop="updateEventTime"
    @event-duration-change="updateEventTime"
    @keydown.meta.delete.exact="deleteSelectedTask()"
    @keydown.meta.v.exact="duplicateSelectedTask()"
    @keydown.meta.d.exact="duplicateSelectedTask()"
    active-view="week"
    today-button
    ref="calendar"
  />
  <!-- END | Calendar view -->

  <!-- START | Task creation modal -->
  <n-modal
    v-model:show="showTaskCreationModal"
    @keydown.esc="cancelTaskCreation"
    :mask-closable="false"
  >
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
            :placeholder="
              loadingClickupCards
                ? 'Refreshing Card list'
                : 'Please Select card to start tracking'
            "
          />

          <n-button
            strong
            secondary
            circle
            @click="refreshClickupCards()"
            :disabled="loadingClickupCards"
            style="border: none; background: none"
          >
            <n-icon name="refresh" size="20" :class="{ rotate: loadingClickupCards }">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
        <div style="display: flex; justify-content: flex-end">
          <n-button @click="cancelTaskCreation()" round>Cancel</n-button> &nbsp;
          <n-button @click="createTask()" round type="primary">Create</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
  <!-- END | Task creation modal -->

  <!-- START | Task creation modal -->
  <n-modal v-model:show="showTaskDetailsModal">
    <n-card
      :bordered="false"
      style="max-width: 600px"
      title="Log a new task"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header>

        <span style="display: flex; align-items: center">

          <n-popconfirm
            v-if="selectedTask.deletable"
            :negative-text="null"
            @positive-click="deleteSelectedTask"
            positive-text="delete"
            :show-icon="false"
          >
            <template #trigger>
              <n-button secondary circle type="error" style="margin-right: 14px">
                <n-icon name="delete-tracking-entry" size="18">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </n-icon>
              </n-button>
            </template>

            You sure bout that?
          </n-popconfirm>

          <span>{{ selectedTask.title }}</span>
        </span>
      </template>

      <n-space vertical>
        <!-- TODO: Show some task labels -->
        <!-- TODO: Show current task column -->

        <p>{{ selectedTask.description || "No description provided" }}</p>
      </n-space>
    </n-card>
  </n-modal>
  <!-- END | Task creation modal -->
</template>


<script>
import { ref } from "vue";
import { ipcRenderer } from "electron";
import VueCal from "vue-cal";

import { isEmptyObject } from "../helpers";
import clickupService from "../clickup-service";
import eventFactory from "../events-factory";

import "vue-cal/dist/drag-and-drop.js";
import "vue-cal/dist/vuecal.css";

import {
  NModal,
  NCard,
  NSpace,
  NIcon,
  NPopconfirm,
  NButton,
  NInput,
  NSelect,
  useNotification
} from "naive-ui";

export default {
  components: {
    VueCal,
    NModal,
    NCard,
    NSpace,
    NIcon,
    NPopconfirm,
    NButton,
    NInput,
    NSelect,
  },

  setup() {
    const notification = useNotification();

    return {
      events: ref([]),
      selectedTask: ref({}),

      clickupCards: ref([]),
      loadingClickupCards: ref(false),

      deleteCallable: ref(() => null),
      showTaskCreationModal: ref(false),
      showTaskDetailsModal: ref(false),

      error(options) {
          notification.error({
              duration: 5000,
              ...options
          })
      }
    };
  },

  mounted() {
    // Register background process listeners
    ipcRenderer.on("set-clickup-cards", (event, cards) =>
      this.onClickupCardsRefreshed(cards)
    );

    this.refreshClickupCards();
  },

  methods: {
    /*
    |--------------------------------------------------------------------------
    | FETCH TIME TRACKING ENTRIES
    |--------------------------------------------------------------------------
    */

    async fetchEvents({ startDate, endDate }) {

      clickupService.getTimeTrackingRange(startDate, endDate)
        .then(entries => {
            this.events = entries.map((entry) => eventFactory.fromClickup(entry))
        })
        .catch(error => {

            this.error({
                title: "Could not fetch time tracking entries",
                content: "Check your console & internet connection and try again"
            })

            console.error(error)
        });
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */

    // Instruct background process to refresh clickup cards
    refreshClickupCards() {
      this.loadingClickupCards = true;
      ipcRenderer.send("get-clickup-cards");

      console.info("Refreshing Clickup cards...");
    },

    // Fired when background process sends us the refreshed cards
    onClickupCardsRefreshed(cards) {
      this.clickupCards = cards.map((card) => ({
        value: card.id,
        label: card.name,
      }));

      this.loadingClickupCards = false;

      console.info("Clickup cards refreshed!");
    },

    /*
    |--------------------------------------------------------------------------
    | CREATE A TASK
    |--------------------------------------------------------------------------
    */
    onTaskCreate(event, deleteCallable) {
      // Workaround: Open modal when mouse is released
      // Register mouseup listener that deregisters itself
      const openModalWhenMouseReleased = () => {
        this.showTaskCreationModal = true;
        document.removeEventListener("mouseup", openModalWhenMouseReleased);
      };
      document.addEventListener("mouseup", openModalWhenMouseReleased);
      // End workaround

      this.deleteCallable = deleteCallable;
      this.selectedTask = event;

      return this.selectedTask;
    },

    createTask() {

      if (isEmptyObject(this.selectedTask)) return;

      clickupService.createTimeTrackingEntry(
          this.selectedTask.taskId,
          this.selectedTask.description,
          this.selectedTask.start,
          this.selectedTask.end
        )
        .then((entry) => {
          console.info(`Created time tracking entry for: ${entry.task.name}`);

          this.selectedTask = eventFactory.updateFromRemote(this.selectedTask, entry);
          this.closeCreationModal();
        })
        .catch((error) => {
          this.cancelTaskCreation();

          this.error({
            title: "Looks like something went wrong",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again"
          })

          console.error(error);
        });
    },

    duplicateSelectedTask() {

        clickupService.createTimeTrackingEntry(
          this.selectedTask.taskId,
          this.selectedTask.description,
          this.selectedTask.start,
          this.selectedTask.end
        )
        .then(entry => {
          this.events.push(eventFactory.fromClickup(entry));

          console.info(`Duplicate time tracking entry for: ${entry.task.name}`);
        })
        .catch((error) => {

          this.error({
            title: "Duplication failed",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again"
          })

          console.error(error);
        });

    },

    cancelTaskCreation() {
      this.closeCreationModal();
      this.deleteCallable();
    },

    closeCreationModal() {
      this.showTaskCreationModal = false;
    },

    /*
    |--------------------------------------------------------------------------
    | DELETE A TASK
    |--------------------------------------------------------------------------
    */

    async deleteSelectedTask() {
      if (isEmptyObject(this.selectedTask)) return;

      clickupService.deleteTimeTrackingEntry(this.selectedTask.entryId)
        .then(() => {

          const taskIndex = this.events.findIndex(
            event => event.entryId === this.selectedTask.entryId
          );

          this.events.splice(taskIndex, 1);
          this.showTaskDetailsModal = false;
          this.selectedTask = {};
        })
        .catch(error => {

          this.error({
            title: "Delete failed",
            content: "There was a problem while calling Clickup. Check your console & internet connection and try again"
          })

          console.error(error);
        });
    },

    /*
    |--------------------------------------------------------------------------
    | SELECTING A TASK & DISPLAY DETAIL MODAL
    |--------------------------------------------------------------------------
    */

    onTaskSingleClick(event, e) {
      this.selectedTask = event;
      e.stopPropagation();
    },

    onTaskDoubleClick(event, e) {
      this.selectedTask = event;

      this.showTaskDetailsModal = true;
      e.stopPropagation();
    },

    closeDetailModal() {
      this.showTaskDetailsModal = false;
    },

    /*
    |--------------------------------------------------------------------------
    | UPDATE A TASK
    |--------------------------------------------------------------------------
    */

    updateEventTime({ event, originalEvent }) {

      clickupService.updateTimeTrackingEntry(
          event.entryId,
          event.description,
          event.start,
          event.end
        )
        .then(entry => {
          const eventIndex = this.events.findIndex(
            e => e.entryId === event.entryId
          );

          // Update the modeled event so copy/paste/duplicate works properly
          this.events.splice(eventIndex, 1, eventFactory.updateFromRemote(event, entry));
          console.dir(`Updated time tracking entry for: ${entry.task.name}`)
        })
        .catch((error) => {

          this.notification.error({
            duration: 5000,
            title: "Update failed",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and refresh the app"
          })

          console.error(error);
          // TODO: Reset event to what it was before failed update
        });

      originalEvent; /*  */
    }

  },
};
</script>


<style lang="css">
.vuecal__header {
  position: fixed;
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  z-index: 9;
}

.vuecal__body {
  margin-top: 78px;
}

.vuecal__cell .vuecal__event * {
  user-select: none;
}

.vuecal__event {
  color: #666666de;
  text-align: left;

  padding: 0 0.4em 0 .6em;
  border-top: 2px solid #fff;
  border-radius: 0 6px 6px 0;

  background-color: rgba(173, 216, 230, 0.5);
  border-bottom: 0.5px solid rgba(173, 216, 230, 0.8);

  transition: transform 0.4s;
}

.vuecal__event::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background-color: rgba(173, 216, 230, 0.8);
}

.vuecal__event.vuecal__event--focus {
    box-shadow: 2px 2px 7px rgb(0 0 0 / 16%);
    transform: scale(1.03);
}

.vuecal__event.not-editable {
  background-color: rgba(240, 68, 29, .6);
  color: white;
}

.vuecal__event.not-editable::before {
    background-color: rgba(240, 68, 29, 1);
}

.vuecal__event-title {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vuecal__cell--selected {
  background-color: rgb(197, 236, 255, 0.2);
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
