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
        title="What did you work on?"
    >
      <template #header> What did you work on?</template>

      <n-form
          ref="createForm"
          :model="formValue"
          :rules="rules"
          size="large"
      >
        <div class="flex space-x-2">
          <!-- Searchable nest dropdown for Space>lists>task>subtasks-->


          <!-- Refresh button -->
          <n-button :disabled="loadingClickupSpaces" circle class="mt-0.5 bg-transparent color-gray-600"
                    secondary
                    strong
                    @click="refreshClickupSpaces"
          >
            <n-icon class="flex items-center justify-center" name="refresh" size="20">
              <div v-if="loadingClickupSpaces" class="w-2 h-2 bg-blue-800 rounded-full animate-ping"></div>
              <arrow-path-icon v-else/>
            </n-icon>
          </n-button>
        </div>

        <div class="flex space-x-2">
          <!-- Searchable task select -->
          <n-form-item :show-label="false" class="flex-grow" path="task.taskId">
            <n-select
                v-model:value="formValue.task.taskId"
                :disabled="loadingClickupCards"
                :options="clickupCards"
                :placeholder="
                loadingClickupCards
                  ? 'Refreshing Card list...'
                  : 'Please Select card to start tracking'
              "
                :render-label="renderTaskOptionLabel"
                :render-tag="({ option, handleClose }) => option.name"
                filterable
            />
          </n-form-item>

          <!-- Refresh button -->
          <!-- TODO: reimplement cashing -->
          <n-button :disabled="loadingClickupCards" circle class="mt-0.5 bg-transparent color-gray-600"
                    secondary
                    strong
                    @click="getClickupCards()"
          >
            <n-icon class="flex items-center justify-center" name="refresh" size="20">
              <div v-if="loadingClickupCards" class="w-2 h-2 bg-blue-800 rounded-full animate-ping"></div>
              <arrow-path-icon v-else/>
            </n-icon>
          </n-button>
        </div>

        <!-- Description textbox -->
        <n-form-item :show-label="false" path="description">
          <n-mention
              v-model:value="formValue.task.description"
              :options="mentionable"
              :render-label="renderMentionLabel"
              placeholder="Describe what you worked on"
              type="textarea"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <n-button round @click="cancelTaskCreation()">Cancel</n-button>
          <n-button
              round
              type="primary" @click="createTask()"
          >Create
          </n-button>
        </div>
      </template>
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
import {ipcRenderer} from "electron";

const shell = require('electron').shell;

import VueCal from "vue-cal";
import "@/assets/vuecal.scss";

import store from "@/store";
import {isEmptyObject} from "@/helpers";
import eventFactory from "@/events-factory";
import clickupService from "@/clickup-service";
import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";

import MemberSelector from '@/components/MemberSelector'
import {CogIcon, UsersIcon, InformationCircleIcon, ArrowPathIcon} from "@heroicons/vue/20/solid";
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
  NSelect,
  NAvatar,
  useNotification
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
    const createForm = ref(null);

    return {
      shell,
      store,

      createForm,
      events: ref([]),
      selectedSpaces: ref(null),
      selectedList: ref(null),
      selectedTask: ref(null),
      mentionable: ref([]),

      // One list to rule them all
      clickUpItems: ref([]),

      clickupCards: ref([]),
      loadingClickupCards: ref(false),

      clickupSpaces: ref([]),
      loadingClickupSpaces: ref(false),

      clickupLists: ref([]),
      loadingClickupLists: ref(false),

      deleteCallable: ref(() => null),
      showTaskCreationModal: ref(false),
      showTaskDetailsModal: ref(false),
      memberSelectorOpen: ref(false),

      formValue: ref({
        task: {
          taskId: null,
          description: null,
        },
      }),

      rules: {
        task: {
          taskId: {
            required: true,
            message: "Please select a task to start tracking",
          },
          description: {
            required: store.get('settings.require_description'),
            trigger: ["blur"],
            message: "Please provide a description",
          }
        }
      },

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
    ipcRenderer.on("set-clickup-spaces", (event, spaces) =>
        this.onClickupSpacesRefreshed(spaces),
    );

    ipcRenderer.on("fetch-clickup-spaces-error", (event, error) =>
        this.error({
          error,
          title: "Failed to fetch Clickup spaces in the background",
          content: "You can try again later by pressing the refresh button when searching for a space",
        })
    );

    ipcRenderer.on("set-clickup-lists", (event, lists) =>
        this.onClickupListsRefreshed(lists)
    );

    ipcRenderer.on("fetch-clickup-lists-error", (event, error) =>
        this.error({
          error,
          title: "Failed to fetch Clickup lists in the background",
          content: "You can try again later by pressing the refresh button when searching for a list",
        })
    );

    ipcRenderer.on("set-clickup-cards", (event, cards) =>
        this.onClickupCardsRefreshed(cards)
    );

    ipcRenderer.on("fetch-clickup-cards-error", (event, error) =>
        this.error({
          error,
          title: "Failed to fetch Clickup tasks in the background",
          content: "You can try again later by pressing the refresh button when searching for a task",
        })
    );
    this.getClickupSpaces()

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
    | TREE SELECT CHANGE HANDLER
    |--------------------------------------------------------------------------
     */

    handleTreeSelectChange(option) {
      console.log("Tree select changed")
      console.dir(option)
      switch (option.type) {
        case ClickUpType.SPACE:
          break
        case ClickUpType.LIST:
          this.getClickupLists(option.id)
          break
        case ClickUpType.TASK:
          this.selectedTask(option)
          break
        default:
          console.error("Unknown type")
      }
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH CLICKUP SPACES FOR SELECT FIELD
    |--------------------------------------------------------------------------
     */

    getClickupSpaces() {
      this.loadingClickupSpaces = true;
      ipcRenderer.send("get-clickup-spaces");

      console.info("Fetching Clickup spaces (from cache when available)...");
    },

    refreshClickupSpaces() {
      this.loadingClickupSpaces = true;
      ipcRenderer.send("refresh-clickup-spaces");

      console.info("Refreshing Clickup spaces...");
    },

    onClickupSpacesRefreshed(spaces) {

      for (const space of spaces) {
        this.addClickupItem({
          type: ClickUpType.SPACE,
          id: space.id,
          name: space.name,
          label: space.name,
          children: []
        })
      }

      this.loadingClickupSpaces = false;

      console.dir(this.clickupSpaces)
      console.info("Clickup spaces refreshed!");
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH CLICKUP LISTS FOR SELECT FIELD
    |--------------------------------------------------------------------------
     */

    getClickupLists(spaceId) {
      if (!spaceId) {
        spaceId = this.selectedSpaces
      }
      this.loadingClickupLists = true;
      ipcRenderer.send("get-clickup-lists", spaceId);

      console.info("Fetching Clickup lists (from cache when available)...");
    },

    refreshClickupLists() {
      this.loadingClickupLists = true;
      ipcRenderer.send("refresh-clickup-lists", this.selectedSpaces);

      console.info("Refreshing Clickup lists...");
    },

    onClickupListsRefreshed(lists) {
      // turn lists into a list of ClickUpItems
      // add this list to the corresponding clickUpItems space
      for (const list of lists) {
        this.clickUpItems.find(item => item.id === list.space.id).addChild({
          type: ClickUpType.LIST,
          id: list.id,
          name: list.name,
          label: list.name,
          children: []
        })
      }

      this.loadingClickupLists = false;

      console.dir(this.clickupLists)
      console.info("Clickup lists refreshed!");
    },

    /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */
    // Instruct background process to get cached clickup cards
    getClickupCards() {
      this.loadingClickupCards = true;

      ipcRenderer.send("get-clickup-cards", this.selectedSpaces, this.selectedList);

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
        label: `${card.name} ${card.folder}` // Native UI uses this for fuzzy searching
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
      this.createForm.validate()
          .then(() => pushToClickup())
          .catch(errors => console.error(errors))

      const pushToClickup = () => {
        console.log("Test pushing to Clickup...")
        console.log(this.selectedTask + " " + this.formValue.task.description + " " + this.selectedTask.start + " " + this.selectedTask.end)
        console.log(this.formValue)
        /*
        clickupService.createTimeTrackingEntry(
            this.selectedTask,
            this.formValue.task.description,
            this.selectedTask.start,
            this.selectedTask.end
        ).then(entry => {
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
         */
        // reset form values at the end
        this.formValue = {
          task: {
            space: null,
            lists: null,
            taskId: null,
            description: null,
          },
        };
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
    },

    addClickupItem: function (item){
      if(!(item instanceof ClickUpItem)){
        throw new Error("item must be of type ClickUpItem")
      }

      this.clickUpItems.push(item)
    },
  }
};
</script>
