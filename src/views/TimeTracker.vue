<template>
  <!-- START | Calendar view -->
  <vue-cal
    :editable-events="{ drag: true, resize: true, create: true }"
    :disable-views="['years', 'year', 'month', 'day']"
    :on-event-create="onTaskCreate"
    :on-event-click="onTaskSingleClick"
    :on-event-dblclick="onTaskDoubleClick"
    :drag-to-create-threshold="20"
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
    @event-drop="updateTimeTrackingEntry"
    @event-duration-change="updateTimeTrackingEntry"
    @keydown.meta.delete.exact="deleteSelectedTask()"
    @keydown.meta.v.exact="duplicateSelectedTask()"
    @keydown.meta.d.exact="duplicateSelectedTask()"
    active-view="week"
    today-button
    ref="calendar"
  >
    <template v-slot:title="{ title }">
        <div class="flex items-center space-x-4">

            <span type="false" aria-label="false">{{ title }}</span>

            <!-- START | Extra controls -->
            <div class="flex text-gray-700 hover:text-gray-800" style="-webkit-app-region: no-drag">
                <router-link :to="{ name: 'settings' }" replace>
                    <cog-icon class="w-5" />
                </router-link>
            </div>
            <!-- End | Extra controls -->

        </div>
    </template>
  </vue-cal>
  <!-- END | Calendar view -->

  <!-- START | Task creation modal -->
  <n-modal
    v-model:show="showTaskCreationModal"
    @keydown.esc="cancelTaskCreation"
    :mask-closable="false"
  >
    <n-card
      :bordered="false"
      class="max-w-xl"
      title="Log a new task"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header> Log a new task </template>

      <n-space vertical>
        <div class="flex items-center space-x-1">
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
            strong secondary circle
            @click="refreshClickupCards()"
            :disabled="loadingClickupCards"
            class="bg-transparent color-gray-700"
          >
            <n-icon name="refresh" size="20">
              <svg :class="{ 'animate-spin transform rotate-180 transform-gpu': loadingClickupCards }" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
        <div class="flex justify-end space-x-2">
          <n-button @click="cancelTaskCreation()" round>Cancel</n-button>
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
      class="max-w-xl"
      title="Log a new task"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header>

        <span class="flex items-center space-x-3">

          <n-popconfirm
            v-if="selectedTask.deletable"
            :negative-text="null"
            @positive-click="deleteSelectedTask"
            positive-text="delete"
            :show-icon="false"
          >
            <template #trigger>
              <n-button secondary circle type="error">
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
import "vue-cal/dist/drag-and-drop.js";
import "vue-cal/dist/vuecal.css";

import { isEmptyObject } from "../helpers";
import clickupService from "../clickup-service";
import eventFactory from "../events-factory";

import { NModal, NCard, NSpace, NIcon, NPopconfirm, NButton, NInput, NSelect, useNotification } from "naive-ui";
import { RouterLink } from "vue-router";
import { CogIcon } from '@heroicons/vue/outline'

export default {
  components: { VueCal, RouterLink, NModal, NCard, NSpace, NIcon, NPopconfirm, NButton, NInput, NSelect, CogIcon },

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
        notification.error({ duration: 5000, ...options })
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
          this.events.push(this.selectedTask) // Explicitly push to model so time update works properly

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

          console.info(`Duplicated time tracking entry for: ${entry.task.name}`);
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

    updateTimeTrackingEntry({ event, originalEvent }) {

      clickupService.updateTimeTrackingEntry(
          event.entryId,
          event.description,
          event.start,
          event.end
        )
        .then(entry => {

          // Update the modeled event so copy/paste/duplicate works properly
          const eventIndex = this.events.findIndex(
            e => e.entryId === event.entryId
          );

          if(eventIndex === -1) return;

          this.events[eventIndex] = {...this.events[eventIndex], ...eventFactory.fromClickup(entry)};


          console.dir(`Updated time tracking entry for: ${entry.task.name}`)
        })
        .catch(error => {

          this.error({
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

/* Make title bar draggable */
.vuecal__title-bar {
  -webkit-app-region: drag;
}

/* But exclude children that aren't the title (hacky workaroud) */
.vuecal__title-bar>:not(.vuecal__flex .vuecal__title) {
    -webkit-app-region: no-drag;
}

/* Order title bar controls */
.vuecal__title-bar .vuecal__title {
    order: 1;
    font-size: .7em;
    margin: 0 4px;

    justify-content: flex-end;
}

.vuecal__title-bar .vuecal__arrow--prev { order: 2 }

.vuecal__title-bar .vuecal__today-btn { order: 3 }

.vuecal__title-bar .vuecal__arrow--next { order: 4 }

/* Style the calendar itself */
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

.vuecal__cell--selected {
  background-color: rgb(197, 236, 255, 0.2);
}

/* The events */
.vuecal__event {
  color: #666666de;
  text-align: left;

  padding: 0 0.4em 0 .6em;
  border-top: 2px solid #fff;
  border-radius: 0 6px 6px 0;

  background-color: rgba(173, 216, 230, 0.5);
  border-bottom: 0.5px solid rgba(173, 216, 230, 0.8);

  transition: transform 0.08s;
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
    transform: scale(1.025);
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

</style>
