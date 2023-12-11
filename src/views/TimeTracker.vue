<template>
  <member-selector
      v-if="store.get('settings.admin_features_enabled')"
      :open="memberSelectorOpen"
  />

  <!-- START | Calendar view -->
  <vue-cal
      ref="calendar"
      :click-to-navigate="false"
      :disable-views="['years', 'year', 'month', 'day']"
      :drag-to-create-threshold="20"
      :editable-events="{ drag: true, resize: true, create: true }"
      :events="events"
      :hide-view-selector="true"
      :hide-weekends="!store.get('settings.show_weekend')"
      :on-event-click="onTaskSingleClick"
      :on-event-create="onTaskCreate"
      :on-event-dblclick="onTaskDoubleClick"
      :snap-to-time="15"
      :time-cell-height="90"
      :time-from="dayStart"
      :time-to="dayEnd"
      :watch-real-time="true"
      active-view="week"
      today-button
      @mousedown="memberSelectorOpen = false"
      @ready="fetchEvents"
      @view-change="fetchEvents"
      @event-drop="updateTimeTrackingEntry"
      @event-duration-change="updateTimeTrackingEntry"
      @keydown.meta.delete.exact="deleteSelectedTask()"
      @keydown.meta.v.exact="duplicateSelectedTask()"
      @keydown.meta.d.exact="duplicateSelectedTask()"
      @keydown.meta.x.exact="refreshBackgroundImage()"
  >
    <template v-slot:title="{ title }">
      <div class="flex items-center space-x-4">
        <span aria-label="false" type="false">{{ title }}</span>

        <!-- START | Extra controls -->
        <div
            class="flex space-x-1 text-gray-600"
            style="-webkit-app-region: no-drag"
        >
          <router-link :to="{ name: 'settings' }" class="hover:text-gray-800" replace>
            <cog-icon class="w-5"/>
          </router-link>

          <button
              v-if="store.get('settings.admin_features_enabled')"
              class="hover:text-gray-800"
              @click="memberSelectorOpen = !memberSelectorOpen"
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
        <n-popover :delay="500" :duration="60" trigger="hover" width="260">

          <template #trigger>
                    <span class="vuecal__event-task-info-popover absolute top-0 right-0 py-0.5 px-1 cursor-pointer">
                        <information-circle-icon class="w-4 text-blue-300 transition-all hover:scale-125"/>
                    </span>
          </template>

          <template #header>
            <span class="font-semibold text-gray-700" v-text="event.title"></span>
          </template>

          <span class="whitespace-pre-wrap" v-text="event.description"></span>

          <hr class="my-2 -mx-3.5"/>

          <button class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700"
                  @click="shell.openExternal(event.taskUrl)">
            <img alt="Open task in ClickUp" class="mt-1 w-7" src="@/assets/images/white-rounded-logo.svg">
            <span>Open in ClickUp</span>
          </button>

          <button class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700"
                  @click="onTaskDoubleClick(event)">
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
      :mask-closable="false"
      @keydown.esc="cancelTaskCreation"
  >
    <n-card
        :bordered="false"
        aria-modal="true"
        class="max-w-xl"
        role="dialog"
        size="huge"
    >

      <TaskCreatorForm
          :end="selectedTask.end"
          :start="selectedTask.start"
          @close="cancelTaskCreation"
          @create="pushTimeTrackingEntry"
      />

    </n-card>
  </n-modal>
  <!-- END | Task creation modal -->

  <!-- START | Task detail modal -->
  <n-modal v-model:show="showTaskDetailsModal">
    <n-card
        :bordered="false"
        aria-modal="true"
        class="max-w-xl"
        role="dialog"
        size="huge"
        title="Edit tracking entry"
    >
      <template #header>
        <span class="flex items-center space-x-3">
          <n-popconfirm
              v-if="selectedTask.deletable"
              :negative-text="null"
              :show-icon="false"
              positive-text="delete"
              @positive-click="deleteSelectedTask"
          >
            <template #trigger>
              <n-button circle secondary type="error">
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

        <n-form ref="editForm" :model="selectedTask" :rules="rules.task" size="large">
          <n-form-item :show-label="false" path="description">
            <n-mention
                v-model:value="selectedTask.description"
                :options="mentionable"
                :render-label="renderMentionLabel"
                placeholder="Describe what you worked on"
                type="textarea"
            />
          </n-form-item>
        </n-form>

      </n-space>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <n-button round @click="closeDetailModal()">Cancel</n-button>
          <n-button round type="primary" @click="updateTimeTrackingEntry({ event: selectedTask })">Update</n-button>
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
    InformationCircleIcon,
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
      selectedTask: ref({}),

      rules: ref({
        task: {
          taskId: {
            required: true,
            message: 'Please select a task'
          },
          description: {
            required: store.get('settings.requireDescription'),
            message: 'Please describe what you worked on',
            trigger: ['blur']
          },
        },
      }),

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

  data() {
    return {
      colorPalette: new Map(),
      colorClasses: ''
    }
  },

  async mounted() {
    // Register background process listeners
    this.fetchMentionableUsers();

    // Load background image if set
    this.refreshBackgroundImage();

    if (!store.get('settings.custom_color_enabled')) {
      this.colorPalette = await this.getColorPalette();
      this.colorClasses = this.colorPaletteToStyleClasses();
      this.$nextTick(() => {
        this.addStyleToHead(this.colorClasses)
      })
    } else {
      this.$nextTick(() => {
        this.removeStyleFromHead()
      })
    }
  },

  computed: {
      dayStart() {
          if(! store.get('settings.day_start')) return 7 * 60
          if (store.get('settings.day_start') > 24) return 7 * 60
          return store.get('settings.day_start') * 60;
      },

      dayEnd() {
          if(! store.get('settings.day_end')) return 22 * 60
          if(store.get('settings.day_end') > 24) return 22 * 60
          return store.get('settings.day_end') * 60;
      },
  },

  methods: {
    /*
    |--------------------------------------------------------------------------
    | FETCH TIME TRACKING ENTRIES
    |--------------------------------------------------------------------------
    */

    async fetchEvents({startDate, endDate}) {
      let customColorEnabled = false
      if (store.get("settings.custom_color_enabled")) {
        customColorEnabled = store.get("settings.custom_color_enabled")
      }
      console.log(startDate, endDate)
      clickupService
          .getTimeTrackingRange(startDate, endDate)
          .then(entries => {
            this.events = entries
                .map((entry) => eventFactory.fromClickup(entry)) // Map into Event DTO
                .map((entry) => {
                  if (customColorEnabled) this.colorEvent(entry) // Color the event
                  return entry
                })
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
      this.colorEvent(event)
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

    pushTimeTrackingEntry(event) {
      this.closeCreationModal();
      eventFactory.updateFromRemote(this.selectedTask, event).then((entry) => {
        this.selectedTask = entry
        this.events.push(entry);
      });
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

    onTaskSingleClick(event) {
      this.selectedTask = event;
    },

    onTaskDoubleClick(event) {
      this.selectedTask = event;

      this.showTaskDetailsModal = true;
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
            this.closeDetailModal()

            const eventIndex = this.events.findIndex(
                (e) => e.entryId === event.entryId
            );
            if (eventIndex === -1) return;

            eventFactory.updateFromRemote(this.events[eventIndex], entry).then((updatedEvent) => {
              this.events[eventIndex] = updatedEvent
            })
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

      originalEvent;
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
    },

    colorEvent: function (event) {
      const customColor = store.get("settings.color")
      document.documentElement.style.setProperty('--event-background-color', customColor);
      return event
    },

    getColorPalette: async function () {
      return await clickupService.getColorsBySpace()
    },

    colorPaletteToStyleClasses: function (){
      let classes = '';
      this.colorPalette.forEach((value, key) => {
        classes += `
          .space-${key} {
            background-color: ${value}59;
          }
          .space-${key}::before {
            background-color: ${value};
          }
        `
      })
      return classes
    },

    addStyleToHead: function (style) {
      const styleElement = document.createElement('style')
      styleElement.textContent = style
      styleElement.id = 'space-colors'
      document.head.append(styleElement)
    },

    removeStyleFromHead: function () {
      const styleElement = document.getElementById('space-colors')
      if (styleElement) {
        document.head.removeChild(styleElement)
      }
    }
  }
};
</script>
