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
          <router-link :to="{ name: 'settings' }" replace class="hover:text-gray-800">
            <cog-icon class="w-5"/>
          </router-link>

          <button
              v-if="store.get('settings.admin_features_enabled')"
              @click="memberSelectorOpen = !memberSelectorOpen"
              class="hover:text-gray-800"
          >
            <users-icon class="w-5"/>
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
          <span class="small">{{ heading.date.toLocaleDateString('en-US', {weekday: 'short'}) }}</span>
          <span class="xsmall">{{ heading.label[0] }}</span>
          <span>&nbsp;{{ heading.date.toLocaleDateString('en-US', {day: 'numeric'}) }}</span>
        </div>

        <div
            v-if="hasTimeTrackedOn(heading.date, view.events)"
            class="inline-flex items-center ml-2 text-xs text-gray-600 space-x-[2px]"
        >
          <clock-icon class="w-3 -mt-0.5"/>
          <span class="italic">{{ totalHoursOnDate(heading.date, view.events) }}</span>
        </div>

      </div>
    </template>
    <!-- END | Custom Day heading -->

    <!-- START | Custom Event template -->
    <template v-slot:event="{ event }">

      <div class="vuecal__event-title">
        <span v-text="event.title"/>

        <!-- START | Task context popover -->
        <n-popover trigger="hover" :delay="500" :duration="60" width="260">

          <template #trigger>
                    <span class="vuecal__event-task-info-popover absolute top-0 right-0 py-0.5 px-1 cursor-pointer">
                        <information-circle-icon class="w-4 text-blue-300 transition-all hover:scale-125"/>
                    </span>
          </template>

          <template #header>
            <span class="font-semibold text-gray-700" v-text="event.title"></span>
          </template>

          <span v-text="event.description" class="whitespace-pre-wrap"></span>

          <hr class="my-2 -mx-3.5"/>

          <button @click="shell.openExternal(event.taskUrl)"
                  class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700">
            <img class="mt-1 w-7" src="@/assets/images/white-rounded-logo.svg" alt="Open task in ClickUp">
            <span>Open in ClickUp</span>
          </button>

          <button @click="onTaskDoubleClick(event)"
                  class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700">
            <pencil-icon class="w-4 mx-1.5"/>
            <span>Open details</span>
          </button>

        </n-popover>
        <!-- END | Task context popover -->

      </div>

      <!-- START | Time from/to -->
      <div class="vuecal__event-time">
        {{ event.start.formatTime('HH:mm') }}
        <span class="mx-1">-</span>
        {{ event.end.formatTime('HH:mm') }}
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
        size="huge"
        role="dialog"
        aria-modal="true"
    >

      <TaskCreatorForm/>

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
                  <trash-icon/>
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

        <n-form :model="selectedTask" :rules="rules.task" ref="editForm" size="large">
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
          <n-button @click="updateTimeTrackingEntry({ event: selectedTask })" round type="primary">Update</n-button>
        </div>
      </template>

    </n-card>
  </n-modal>
  <!-- END | Task detail modal -->
</template>


<script>
import {ref, h} from "vue";
import {RouterLink} from "vue-router";

const shell = require('electron').shell;

import VueCal from "vue-cal";
import "@/assets/vuecal.scss";

import store from "@/store";
import {isEmptyObject} from "@/helpers";
import eventFactory from "@/events-factory";
import clickupService from "@/clickup-service";

import MemberSelector from '@/components/MemberSelector'
import {CogIcon, UsersIcon, InformationCircleIcon} from "@heroicons/vue/20/solid";
import {ClockIcon, TrashIcon, PencilIcon} from "@heroicons/vue/24/outline";
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
  NAvatar,
  useNotification
} from "naive-ui";
import TaskCreatorForm from "@/components/TaskCreatorForm.vue";

export default {
  components: {
    TaskCreatorForm,
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
    NPopconfirm,
    NPopover,
    NButton,
    ClockIcon,
    CogIcon,
    UsersIcon,
    TrashIcon,
    PencilIcon,
    InformationCircleIcon
  },

  setup() {
    const notification = useNotification();
    const createForm = ref(null);

    return {
      shell,
      store,

      createForm,
      events: ref([]),
      mentionable: ref([]),

      deleteCallable: ref(() => null),
      showTaskCreationModal: ref(false),
      showTaskDetailsModal: ref(false),
      memberSelectorOpen: ref(false),


      success(options) {
        notification.success({duration: 5000, ...options});
      },

      error(options) {
        notification.error({duration: 5000, ...options});

        if (options.error) {
          console.error(options.error);
        }
      }
    };
  },

  mounted() {
    // Register background process listeners
    this.fetchMentionableUsers();

    // Load background image if set
    this.refreshBackgroundImage();
  },

  computed: {
    dayStart() {
      if (!store.get('settings.day_start')) return 7 * 60

      const dateTime = new Date(store.get('settings.day_start'))

      return dateTime.getHours() * 60;
    },

    dayEnd() {
      if (!store.get('settings.day_end')) return 22 * 60

      const dateTime = new Date(store.get('settings.day_end'))

      return dateTime.getHours() * 60;
    },
  },

  methods: {
    /*
    |--------------------------------------------------------------------------
    | FETCH TIME TRACKING ENTRIES
    |--------------------------------------------------------------------------
    */
    async fetchEvents({startDate, endDate}) {
      clickupService
          .getTimeTrackingRange(startDate, endDate)
          .then(entries => {
            this.events = entries
                .map((entry) => eventFactory.fromClickup(entry)) // Map into Event DTO
                .filter((entry) => entry); // Remove falsey entries
          })
          .catch(error => this.error({
            error,
            title: "Could not fetch time tracking entries",
            content: "Check your console & internet connection and try again",
          }));
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

    renderTaskOptionLabel(option) {
      return h('div', {class: 'my-1'}, [
        h('div', option.name),
        h('div', {class: 'text-xs text-gray-500'}, option.folder)
      ])
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

    updateTimeTrackingEntry({event, originalEvent}) {
      clickupService.updateTimeTrackingEntry(
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

            this.events[eventIndex] = eventFactory.updateFromRemote(
                this.events[eventIndex],
                entry
            );

            this.closeDetailModal()

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

    /*
    |--------------------------------------------------------------------------
    | MISC & EASTER EGG LAND
    |--------------------------------------------------------------------------
    */
    totalHoursOnDate(date, events) {
      let totalMinutes = events
          .filter(event => event.start.getDate() == date.getDate())
          .reduce((carry, event) => carry + (event.endTimeMinutes - event.startTimeMinutes), 0)

      let hours = Math.floor(totalMinutes / 60)
      let minutes = totalMinutes % 60

      if (totalMinutes === 0) {
        return
      }

      return hours + ':' + String(minutes).padStart(2, '0')
    },

    hasTimeTrackedOn(date, events) {
      return Boolean(
          events.find(event => event.start.getDate() == date.getDate())
      )
    },

    fetchMentionableUsers() {
      clickupService.getCachedUsers().then(users => {
        this.mentionable = users.map(user => ({
          label: user.username.toLowerCase(),
          value: user.username.toLowerCase(),
          avatar: user.profilePicture,
          initials: user.initials
        }))
      })
    },

    renderMentionLabel(option) {
      return h('div', {style: 'display: flex; align-items: center;'}, [
        h(NAvatar, {
          style: 'margin-right: 8px;',
          size: 24,
          round: true,
          src: option.avatar
        }, option.avatar ? '' : option.initials,),
        option.value
      ])
    },

    refreshBackgroundImage: function () {

      const bg = document.getElementsByClassName('vuecal')[0];
      const url = store.get("settings.background_image_url")
      if (!url) return

      bg.style.backgroundImage = `url('${url}?${Math.random()}')`;
      bg.style.backgroundRepeat = "no-repeat";
      bg.style.backgroundPosition = "center";
      bg.style.backgroundSize = "cover";
    }
  }
};
</script>
