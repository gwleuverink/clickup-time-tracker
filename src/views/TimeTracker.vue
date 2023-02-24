<template>
  <member-selector
    v-if="store.get('settings.admin_features_enabled')"
    :open="memberSelectorOpen"
  />

  <!-- START | Calendar view -->
  <vue-cal
    :editable-events="{ drag: true, resize: true, create: true }"
    :hide-weekends="!store.get('settings.show_weekend')"
    :disable-views="['years', 'year', 'month', 'day']"
    :on-event-dblclick="onTaskDoubleClick"
    :on-event-click="onTaskSingleClick"
    :on-event-create="onTaskCreate"
    :drag-to-create-threshold="20"
    :click-to-navigate="false"
    :hide-view-selector="true"
    :watch-real-time="true"
    :time-cell-height="90"
    :time-from="dayStart"
    :time-to="dayEnd"
    :snap-to-time="15"
    :events="events"
    @ready="fetchEvents"
    @view-change="fetchEvents"
    @event-drop="updateTimeTrackingEntry"
    @event-duration-change="updateTimeTrackingEntry"
    @keydown.meta.delete.exact="deleteSelectedTask()"
    @keydown.meta.v.exact="duplicateSelectedTask()"
    @keydown.meta.d.exact="duplicateSelectedTask()"
    @keydown.meta.x.exact="refreshBackgroundImage()"
    @mousedown="memberSelectorOpen = false"
    active-view="week"
    today-button
    ref="calendar"
  >
    <template v-slot:title="{ title }">
      <div class="flex items-center space-x-4">
        <span type="false" aria-label="false">{{ title }}</span>

        <!-- START | Extra controls -->
        <div
          class="flex space-x-1 text-gray-600"
          style="-webkit-app-region: no-drag"
        >
          <router-link
            :to="{ name: 'settings' }"
            replace
            class="hover:text-gray-800"
          >
            <cog-icon class="w-5" />
          </router-link>

          <button
            v-if="store.get('settings.admin_features_enabled')"
            @click="memberSelectorOpen = !memberSelectorOpen"
            class="hover:text-gray-800"
          >
            <users-icon class="w-5" />
          </button>
        </div>
        <!-- End | Extra controls -->
      </div>
    </template>

    <!-- START | Custom Day heading -->
    <template v-slot:weekday-heading="{ heading, view }">
      <div class="flex flex-col justify-center sm:flex-row">
        <div>
          <span class="full">{{ heading.label }}</span>
          <span class="small">{{
            heading.date.toLocaleDateString("en-US", { weekday: "short" })
          }}</span>
          <span class="xsmall">{{ heading.label[0] }}</span>
          <span
            >&nbsp;{{
              heading.date.toLocaleDateString("en-US", { day: "numeric" })
            }}</span
          >
        </div>

        <div
          v-if="hasTimeTrackedOn(heading.date, view.events)"
          class="inline-flex items-center ml-2 text-xs text-gray-600 space-x-[2px]"
        >
          <clock-icon class="w-3 -mt-0.5" />
          <span class="italic">{{
            totalHoursOnDate(heading.date, view.events)
          }}</span>
        </div>
      </div>
    </template>
    <!-- END | Custom Day heading -->

    <!-- START | Custom Event template -->
    <template v-slot:event="{ event }">
      <div class="vuecal__event-title">
        <span v-text="event.title" />

        <!-- START | Task context popover -->
        <n-popover trigger="hover" :delay="500" :duration="60" width="260">
          <template #trigger>
            <span
              class="vuecal__event-task-info-popover absolute top-0 right-0 py-0.5 px-1 cursor-pointer"
            >
              <information-circle-icon
                class="w-4 text-blue-300 transition-all hover:scale-125"
              />
            </span>
          </template>

          <template #header>
            <span
              class="font-semibold text-gray-700"
              v-text="event.title"
            ></span>
          </template>

          <span v-text="event.description" class="whitespace-pre-wrap"></span>

          <hr class="my-2 -mx-3.5" />

          <button
            @click="shell.openExternal(event.taskUrl)"
            class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700"
          >
            <img
              class="mt-1 w-7"
              src="@/assets/images/white-rounded-logo.svg"
              alt="Open task in ClickUp"
            />
            <span>Open in ClickUp</span>
          </button>

          <button
            @click="onTaskDoubleClick(event)"
            class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700"
          >
            <pencil-icon class="w-4 mx-1.5" />
            <span>Open details</span>
          </button>
        </n-popover>
        <!-- END | Task context popover -->
      </div>

      <!-- START | Time from/to -->
      <div class="vuecal__event-time">
        {{ event.start.formatTime("HH:mm") }}
        <span class="mx-1">-</span>
        {{ event.end.formatTime("HH:mm") }}
      </div>
      <!-- END | Time from/to -->
    </template>
    <!-- END | Custom Event template -->
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
      title="What did you work on?"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header> What did you work on? </template>

      <n-form
        :model="selectedTask"
        :rules="rules.task"
        ref="createForm"
        size="large"
      >
        <div class="flex space-x-2">
          <!-- Searchable select -->
          <n-form-item path="taskId" :show-label="false" class="flex-grow">
            <n-select
              filterable
              :options="clickupCards"
              :disabled="loadingClickupCards"
              v-model:value="selectedTask.taskId"
              :render-label="renderTaskOptionLabel"
              :render-tag="({ option, handleClose }) => option.name"
              :placeholder="
                loadingClickupCards
                  ? 'Refreshing Card list...'
                  : 'Please Select card to start tracking'
              "
            />
          </n-form-item>

          <!-- Refresh button -->
          <n-button
            strong
            secondary
            circle
            @click="refreshClickupCards()"
            :disabled="loadingClickupCards"
            class="mt-0.5 bg-transparent color-gray-600"
          >
            <n-icon
              name="refresh"
              size="20"
              class="flex items-center justify-center"
            >
              <div
                v-if="loadingClickupCards"
                class="w-2 h-2 bg-blue-800 rounded-full animate-ping"
              ></div>
              <arrow-path-icon v-else />
            </n-icon>
          </n-button>
        </div>
        <div class="flex space-x-2">
          <!-- Searchable select -->
          <n-form-item path="tags" :show-label="false" class="flex-grow">
            <n-select
              filterable
              :options="clickupTags"
              :disabled="loadingClickupTags"
              v-model:value="selectedTask.tags"
              multiple
              required
              :render-tag="({ option, handleClose }) => option.name"
              :placeholder="
                loadingClickupTags
                  ? 'Refreshing Card list...'
                  : 'Please Select tag to start tracking'
              "
            />
          </n-form-item>

          <!-- Refresh button -->
          <n-button
            strong
            secondary
            circle
            @click="refreshClickupTags()"
            :disabled="loadingClickupTags"
            class="mt-0.5 bg-transparent color-gray-600"
          >
            <n-icon
              name="refresh"
              size="20"
              class="flex items-center justify-center"
            >
              <div
                v-if="loadingClickupTags"
                class="w-2 h-2 bg-blue-800 rounded-full animate-ping"
              ></div>
              <arrow-path-icon v-else />
            </n-icon>
          </n-button>
        </div>

        <!-- Description textbox -->
        <n-form-item path="description" :show-label="false">
          <n-mention
            type="textarea"
            v-model:value="selectedTask.description"
            :options="mentionable"
            :render-label="renderMentionLabel"
            placeholder="Describe what you worked on"
          />
        </n-form-item>
        <!-- is billable -->
        <n-form-item path="billable" :show-label="false">
          <n-switch v-model:value="selectedTask.billable">
            <template #checked> Billable </template>
            <template #unchecked> Not billable </template>
          </n-switch>
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

  <!-- START | Task detail modal -->
  <n-modal v-model:show="showTaskDetailsModal">
    <n-card
      :bordered="false"
      class="max-w-xl"
      title="Edit tracking entry"
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

        <n-form
          :model="selectedTask"
          :rules="rules.task"
          ref="editForm"
          size="large"
        >
          <n-form-item path="description" :show-label="false">
            <n-mention
              type="textarea"
              v-model:value="selectedTask.description"
              :options="mentionable"
              :render-label="renderMentionLabel"
              placeholder="Describe what you worked on"
            />
          </n-form-item>
        </n-form>
      </n-space>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <n-button @click="closeDetailModal()" round>Cancel</n-button>
          <n-button
            @click="updateTimeTrackingEntry({ event: selectedTask })"
            round
            type="primary"
            >Update</n-button
          >
        </div>
      </template>
    </n-card>
  </n-modal>
  <!-- END | Task detail modal -->
</template>

<script>
import { ref, h } from "vue";
import { RouterLink } from "vue-router";
import { ipcRenderer } from "electron";
const shell = require("electron").shell;

import VueCal from "vue-cal";
import "@/assets/vuecal.scss";

import store from "@/store";
import { isEmptyObject } from "@/helpers";
import eventFactory from "@/events-factory";
import clickupService from "@/clickup-service";

import MemberSelector from "@/components/MemberSelector";
import {
  CogIcon,
  UsersIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/vue/20/solid";
import { ClockIcon, TrashIcon, PencilIcon } from "@heroicons/vue/24/outline";
import {
  NMention,
  NModal,
  NCard,
  NForm,
  NFormItem,
  NSpace,
  NIcon,
  NPopconfirm,
  NPopover,
  NButton,
  NSelect,
  NAvatar,
  NSwitch,
  useNotification,
} from "naive-ui";

export default {
  components: {
    VueCal,
    MemberSelector,
    RouterLink,
    NMention,
    NModal,
    NCard,
    NForm,
    NFormItem,
    NSpace,
    NIcon,
    NSwitch,
    NPopconfirm,
    NPopover,
    NButton,
    NSelect,
    ArrowPathIcon,
    ClockIcon,
    CogIcon,
    UsersIcon,
    TrashIcon,
    PencilIcon,
    InformationCircleIcon,
  },

  setup() {
    const notification = useNotification();

    return {
      shell,
      store,

      events: ref([]),
      selectedTask: ref({}),
      mentionable: ref([]),

      clickupCards: ref([]),
      clickupTags: ref([]),
      loadingClickupCards: ref(false),
      loadingClickupTags: ref(false),

      deleteCallable: ref(() => null),
      showTaskCreationModal: ref(false),
      showTaskDetailsModal: ref(false),
      memberSelectorOpen: ref(false),

      rules: {
        task: {
          taskId: {
            required: true,
            message: "Please select a task to start tracking",
          },
          description: {
            required: store.get("settings.require_description"),
            trigger: ["blur"],
            message: "Please provide a description",
          },
        },
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

    ipcRenderer.on("fetch-clickup-cards-error", (event, error) =>
      this.error({
        error,
        title: "Failed to fetch Clickup tasks in the background",
        content:
          "You can try again later by pressing the refresh button when searching for a task",
      })
    );
    // Register background process listeners
    ipcRenderer.on("set-clickup-tags", (event, tags) => {
      this.onClickupTagsRefreshed(tags);
    });

    ipcRenderer.on("fetch-clickup-tags-error", (event, error) =>
      this.error({
        error,
        title: "Failed to fetch Clickup tags in the background",
        content:
          "You can try again later by pressing the refresh button when searching for a task",
      })
    );

    this.getClickupCards();
    this.getClickupTags();
    this.fetchMentionableUsers();

    // Load background image if set
    this.refreshBackgroundImage();
  },

  computed: {
    dayStart() {
      if (!store.get("settings.day_start")) return 7 * 60;

      const dateTime = new Date(store.get("settings.day_start"));

      return dateTime.getHours() * 60;
    },

    dayEnd() {
      if (!store.get("settings.day_end")) return 22 * 60;

      const dateTime = new Date(store.get("settings.day_end"));

      return dateTime.getHours() * 60;
    },
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
        .then((entries) => {
          this.events = entries
            .map((entry) => eventFactory.fromClickup(entry)) // Map into Event DTO
            .filter((entry) => entry); // Remove falsey entries
        })
        .catch((error) =>
          this.error({
            error,
            title: "Could not fetch time tracking entries",
            content: "Check your console & internet connection and try again",
          })
        );
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */
    // Instruct background process to get cached clickup cards
    getClickupCards() {
      this.loadingClickupCards = true;
      ipcRenderer.send("get-clickup-cards");

      console.info("Fetching Clickup cards (from cache when available)...");
    },

    refreshClickupCards() {
      this.loadingClickupCards = true;
      ipcRenderer.send("refresh-clickup-cards");

      console.info("Refreshing Clickup cards...");
    },

    // Fired when background process sends us the refreshed cards
    onClickupCardsRefreshed(cards) {
      this.clickupCards = cards.map((card) => ({
        value: card.id,
        name: `${card.name}`,
        folder: `${card.folder}`,
        label: `${card.name} ${card.folder}`, // Native UI uses this for fuzzy searching
      }));

      this.loadingClickupCards = false;

      console.info("Clickup cards refreshed!");
    },
    /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP TAGS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */
    // Instruct background process to get cached clickup cards
    getClickupTags() {
      this.loadingClickupTags = true;
      ipcRenderer.send("get-clickup-tags");

      console.info("Fetching Clickup tags (from cache when available)...");
    },

    refreshClickupTags() {
      this.loadingClickupTags = true;
      ipcRenderer.send("refresh-clickup-tags");

      console.info("Refreshing Clickup tags...");
    },

    // Fired when background process sends us the refreshed cards
    onClickupTagsRefreshed(tags) {
      this.clickupTags = tags.map((tag) => ({
        value: tag,
        name: `${tag.name}`,
        label: `${tag.name}`, // Native UI uses this for fuzzy searching
        tag_bg: tag.tag_bg,
        tag_fg: tag.tag_fg,
      }));

      this.loadingClickupTags = false;

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

      this.$refs.createForm
        .validate()
        .then(() => pushToClickup())
        .catch((errors) => console.error(errors));

      const pushToClickup = () => {
        clickupService
          .createTimeTrackingEntry(
            this.selectedTask.taskId,
            this.selectedTask.description,
            this.selectedTask.start,
            this.selectedTask.end,
            this.selectedTask.tags,
            this.selectedTask.billable
          )
          .then((entry) => {
            console.info(`Created time tracking entry for: ${entry.task.name}`);

            this.selectedTask = eventFactory.updateFromRemote(
              this.selectedTask,
              entry
            );
            // Explicitly push to model so time update works properly
            this.events.push(this.selectedTask);

            this.closeCreationModal();
          })
          .catch((error) => {
            this.cancelTaskCreation();

            this.error({
              error,
              title: "Looks like something went wrong",
              content:
                "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
            });
          });
      };
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
        .catch((error) =>
          this.error({
            error,
            title: "Duplication failed",
            content:
              "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
          })
        );
    },

    cancelTaskCreation() {
      this.closeCreationModal();
      this.deleteCallable();
    },

    closeCreationModal() {
      this.showTaskCreationModal = false;
    },

    renderTaskOptionLabel(option) {
      return h("div", { class: "my-1" }, [
        h("div", option.name),
        h("div", { class: "text-xs text-gray-500" }, option.folder),
      ]);
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
        .catch((error) =>
          this.error({
            error,
            title: "Delete failed",
            content:
              "There was a problem while calling Clickup. Check your console & internet connection and try again",
          })
        );
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
      console.log(event);
      clickupService
        .updateTimeTrackingEntry(
          event.entryId,
          event.description,
          event.start,
          event.end,
          event.tags,
          event.billable
        )
        .then((entry) => {
          // Update the modeled event so copy/paste/duplicate works properly
          const eventIndex = this.events.findIndex(
            (e) => e.entryId === event.entryId
          );

          if (eventIndex === -1) return;

          console.dir({
            before: this.events[eventIndex],
            after: entry,
            index: eventIndex,
          });

          this.events[eventIndex] = eventFactory.updateFromRemote(
            this.events[eventIndex],
            entry
          );

          this.closeDetailModal();

          console.dir(`Updated time tracking entry for: ${entry.task.name}`);
        })
        .catch((error) => {
          this.error({
            error,
            duration: 5000,
            title: "Update failed",
            content:
              "There was a problem while pushing to Clickup. Check your console & internet connection and refresh the app",
          });
          // TODO: Reset event to what it was before failed update
        });

      originalEvent; /*  */
    },

    /*
    |--------------------------------------------------------------------------
    | MISC & EASTER EGG LAND
    |--------------------------------------------------------------------------
    */
    totalHoursOnDate(date, events) {
      let totalMinutes = events
        .filter((event) => event.start.getDate() == date.getDate())
        .reduce(
          (carry, event) =>
            carry + (event.endTimeMinutes - event.startTimeMinutes),
          0
        );

      let hours = Math.floor(totalMinutes / 60);
      let minutes = totalMinutes % 60;

      if (totalMinutes === 0) {
        return;
      }

      return hours + ":" + String(minutes).padStart(2, "0");
    },

    hasTimeTrackedOn(date, events) {
      return Boolean(
        events.find((event) => event.start.getDate() == date.getDate())
      );
    },

    fetchMentionableUsers() {
      clickupService.getCachedUsers().then((users) => {
        this.mentionable = users.map((user) => ({
          label: user.username.toLowerCase(),
          value: user.username.toLowerCase(),
          avatar: user.profilePicture,
          initials: user.initials,
        }));
      });
    },

    renderMentionLabel(option) {
      return h("div", { style: "display: flex; align-items: center;" }, [
        h(
          NAvatar,
          {
            style: "margin-right: 8px;",
            size: 24,
            round: true,
            src: option.avatar,
          },
          option.avatar ? "" : option.initials
        ),
        option.value,
      ]);
    },

    refreshBackgroundImage: function () {
      const bg = document.getElementsByClassName("vuecal")[0];
      const url = store.get("settings.background_image_url");
      if (!url) return;

      bg.style.backgroundImage = `url('${url}?${Math.random()}')`;
      bg.style.backgroundRepeat = "no-repeat";
      bg.style.backgroundPosition = "center";
      bg.style.backgroundSize = "cover";
    },
  },
};
</script>
