<template>

  <member-selector :open="true" :active="$route.params.userId" />

  <!-- START | Calendar view -->
  <vue-cal
    :editable-events="false"
    :hide-weekends="false"
    :disable-views="['years', 'year', 'month', 'day']"
    :click-to-navigate="false"
    :hide-view-selector="true"
    :watch-real-time="true"
    :time-cell-height="90"
    :time-from="6 * 60"
    :time-to="24 * 60"
    :events="events"
    @ready="fetchEvents"
    @view-change="fetchEvents"
    @keydown.meta.x.exact="refreshBackgroundImage()"
    active-view="week"
    today-button
    class="mt-[80px]"
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
            <cog-icon class="w-5" />
          </router-link>

          <router-link :to="{ name: 'time-tracker' }" replace class="hover:text-gray-800">
            <user-icon class="w-5" />
          </router-link>
        </div>
        <!-- End | Extra controls -->
      </div>
    </template>

    <template v-slot:event="{ event }" >

        <div class="vuecal__event-title">
            <span v-text="event.title" />

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

                <hr class="my-2 -mx-3.5" />

                <button v-if="event.taskUrl" @click="shell.openExternal(event.taskUrl)" class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700">
                    <img class="mt-1 w-7" src="@/assets/images/white-rounded-logo.svg" alt="Open task in ClickUp">
                    <span>Open in ClickUp</span>
                </button>

                <button @click="onTaskDoubleClick(event)" class="flex items-center py-1 space-x-1 italic text-gray-500 hover:text-gray-700">
                    <pencil-icon class="w-4 mx-1.5" />
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

  </vue-cal>
  <!-- END | Calendar view -->

  <!-- START | Task detail modal -->
  <n-modal v-model:show="showTaskDetailsModal">
    <n-card
      :bordered="false"
      class="max-w-xl"
      :title="selectedTask.title"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <n-space vertical>

        <p class="whitespace-pre-wrap">{{ selectedTask.description || "No description provided" }}</p>

      </n-space>
    </n-card>
  </n-modal>
  <!-- END | Task detail modal -->
</template>


<script>
import { ref, watch } from "vue";
import { RouterLink } from "vue-router";
const shell = require('electron').shell;

import VueCal from "vue-cal";
import "@/assets/vuecal.scss";

import store from "@/store";
import eventFactory from "@/events-factory";
import clickupService from "@/clickup-service";

import { InformationCircleIcon, CogIcon, UserIcon } from "@heroicons/vue/20/solid";
import { PencilIcon } from "@heroicons/vue/24/outline";
import { NModal,  NCard,  NSpace, NPopover,  useNotification } from "naive-ui";
import MemberSelector from '@/components/MemberSelector'

export default {
  components: { MemberSelector, VueCal, RouterLink, NModal, NCard, NSpace, NPopover, CogIcon, UserIcon, PencilIcon, InformationCircleIcon },

  setup() {
    const notification = useNotification();

    return {
      shell,
      store,

      events: ref([]),
      selectedTask: ref({}),

      clickupCards: ref([]),
      loadingClickupCards: ref(false),

      showTaskDetailsModal: ref(false),

      error(options) {
        notification.error({ duration: 5000, ...options });

        if (options.error) {
          console.error(options.error);
        }
      },
    };
  },

  mounted() {
    watch(() => this.$route.params.userId, () => {

        const startDate = this.$refs.calendar.$data.view.startDate
        const endDate = this.$refs.calendar.$data.view.endDate

        this.events = []
        this.fetchEvents({ startDate, endDate })
      }
    )

    // Load background image if set
    this.refreshBackgroundImage();
  },

  methods: {
    /*
    |--------------------------------------------------------------------------
    | FETCH TIME TRACKING ENTRIES
    |--------------------------------------------------------------------------
    */
    async fetchEvents({ startDate, endDate }) {
      clickupService
        .getTimeTrackingRange(startDate, endDate, this.$route.params.userId)
        .then(entries => {
          this.events = entries.map((entry) => eventFactory.fromClickup(entry));
        })
        .catch(error => {
            if(error === 'You have no access') {
                this.error({
                    error,
                    title: "You don't have access",
                    content: "You need to be the workspace administrator in order to see other people's tracking entries",
                })

                return this.$router.replace({ name: 'settings' })
            }

            this.error({
                error,
                title: "Could not fetch time tracking entries",
                content: "Check your console & internet connection and try again",
            })
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
    | MISC & EASTER EGG LAND
    |--------------------------------------------------------------------------
    */
    refreshBackgroundImage: function() {

      const bg = document.getElementsByClassName('vuecal')[0];
      const url = store.get("settings.background_image_url")
      if(!url) return

      bg.style.backgroundImage = `url('${url}?${Math.random()}')`;
      bg.style.backgroundRepeat = "no-repeat";
      bg.style.backgroundPosition = "center";
      bg.style.backgroundSize = "cover";
    }
  }
};
</script>
