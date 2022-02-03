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
        <div
          class="flex text-gray-700 hover:text-gray-800"
          style="-webkit-app-region: no-drag"
        >
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

      <n-form :model="selectedTask" :rules="rules.task" ref="createForm" size="large">
        <div class="flex space-x-2">
          <!-- Searchable select -->
          <n-form-item path="taskId" :show-label="false" class="flex-grow">
            <n-select
              filterable
              :options="clickupCards"
              :disabled="loadingClickupCards"
              v-model:value="selectedTask.taskId"
              :placeholder="
                loadingClickupCards
                  ? 'Refreshing Card list...'
                  : 'Please Select card to start tracking'
              "
            />
          </n-form-item>

          <!-- Refresh button -->
          <n-button strong secondary circle
            @click="refreshClickupCards()"
            :disabled="loadingClickupCards"
            class="mt-0.5 bg-transparent color-gray-600"
          >
            <n-icon name="refresh" size="20" class="flex items-center justify-center">
              <div v-if="loadingClickupCards" class="w-2 h-2 bg-blue-800 rounded-full animate-ping"></div>
              <refresh-icon v-else />
            </n-icon>
          </n-button>
        </div>

        <!-- Description textbox -->
        <n-form-item path="description" :show-label="false">
          <n-input
            type="textarea"
            v-model:value="selectedTask.description"
            placeholder="Describe what you worked on"
          />
        </n-form-item>
      </n-form>

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
                  <trash-icon />
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
import { RouterLink } from "vue-router";
import { ipcRenderer } from "electron";

import VueCal from "vue-cal";
import "vue-cal/dist/drag-and-drop.js";
// import "vue-cal/dist/vuecal.css";
import "@/assets/vuecal.scss";

import { isEmptyObject } from "@/helpers";
import clickupService from "@/clickup-service";
import eventFactory from "@/events-factory";

import { NModal,  NCard,  NForm,  NFormItem,  NSpace,  NIcon,  NPopconfirm,  NButton,  NInput,  NSelect,  useNotification } from "naive-ui";
import { CogIcon, RefreshIcon, TrashIcon } from "@heroicons/vue/outline";

export default {
  components: { VueCal, RouterLink, NModal, NCard, NForm, NFormItem, NSpace, NIcon, NPopconfirm, NButton, NInput, NSelect, CogIcon, RefreshIcon, TrashIcon },

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

      rules: {
          task: {
              taskId: {
                required: true,
                message: "Please select a task to start tracking",
              },
              description: {
                min: 6,
                required: true,
                trigger: ["blur"],
                message: "Please provide a description",
              }
          }
      },

      error(options) {
        notification.error({ duration: 5000, ...options });

        if (options.error) {
          console.error(options.error);
        }
      },
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
      clickupService
        .getTimeTrackingRange(startDate, endDate)
        .then(entries => {
          this.events = entries.map((entry) => eventFactory.fromClickup(entry));
        })
        .catch(error => this.error({
            error,
            title: "Could not fetch time tracking entries",
            content: "Check your console & internet connection and try again",
        }));
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

      this.$refs.createForm.validate()
        .then(() => pushToClickup())
        .catch(errors => console.error(errors))

      const pushToClickup = () => {
        clickupService.createTimeTrackingEntry(
          this.selectedTask.taskId,
          this.selectedTask.description,
          this.selectedTask.start,
          this.selectedTask.end
        )
        .then(entry => {
          console.info(`Created time tracking entry for: ${entry.task.name}`);

          this.selectedTask = eventFactory.updateFromRemote(
            this.selectedTask,
            entry
          );
          // Explicitly push to model so time update works properly
          this.events.push(this.selectedTask);

          this.closeCreationModal();
        })
        .catch(error => {
          this.cancelTaskCreation();

          this.error({
            error,
            title: "Looks like something went wrong",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
          });
        });
      }
    },

    duplicateSelectedTask() {
      clickupService
        .createTimeTrackingEntry(
          this.selectedTask.taskId,
          this.selectedTask.description,
          this.selectedTask.start,
          this.selectedTask.end
        )
        .then((entry) => {
          this.events.push(eventFactory.fromClickup(entry));

          console.info(
            `Duplicated time tracking entry for: ${entry.task.name}`
          );
        })
        .catch(error => this.error({
            error,
            title: "Duplication failed",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
        }));
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

      clickupService
        .deleteTimeTrackingEntry(this.selectedTask.entryId)
        .then(() => {
          const taskIndex = this.events.findIndex(
            (event) => event.entryId === this.selectedTask.entryId
          );

          this.events.splice(taskIndex, 1);
          this.showTaskDetailsModal = false;
          this.selectedTask = {};
        })
        .catch(error => this.error({
            error,
            title: "Delete failed",
            content: "There was a problem while calling Clickup. Check your console & internet connection and try again",
        }));
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
      clickupService
        .updateTimeTrackingEntry(
          event.entryId,
          event.description,
          event.start,
          event.end
        )
        .then((entry) => {
          // Update the modeled event so copy/paste/duplicate works properly
          const eventIndex = this.events.findIndex(
            (e) => e.entryId === event.entryId
          );

          if (eventIndex === -1) return;

          this.events[eventIndex] = {
            ...this.events[eventIndex],
            ...eventFactory.fromClickup(entry),
          };

          console.dir(`Updated time tracking entry for: ${entry.task.name}`);
        })
        .catch(error => {
          this.error({
            error,
            duration: 5000,
            title: "Update failed",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and refresh the app",
          });
          // TODO: Reset event to what it was before failed update
        });

      originalEvent; /*  */
    },
  },
};
</script>
