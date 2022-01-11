<template>

    <!-- START | Calendar view -->
    <vue-cal
        :editable-events="{ drag: true, resize: true, create: true }"
        :disable-views="['years', 'year', 'month', 'day']"
        :on-event-dblclick="selectEvent"
        :click-to-navigate="false"
        :hide-view-selector="true"
        :watch-real-time="true"
        :snap-to-time="5"
        :events="events"
        active-view="week"
        today-button
    />
    <!-- END | Calendar view -->


    <!-- START | Task detail modal -->
    <n-modal v-model:show="showModal">
        <n-card
            :bordered="false"
            style="max-width: 600px"
            title="Task details"
            size="huge"
            role="dialog"
            aria-modal="true"
        >
            <template #header> Oops! </template>
            Content
            <template #footer> Footer </template>
        </n-card>
    </n-modal>
    <!-- END | Task detail modal -->


</template>


<script>
// In your Vue.js component.
import { ref } from 'vue'
import VueCal from 'vue-cal'
import { NModal, NCard } from 'naive-ui';
import 'vue-cal/dist/drag-and-drop.js'
import 'vue-cal/dist/vuecal.css'

export default {
  components: { VueCal, NModal, NCard },

  setup () {
    return {
      showModal: ref(false),
      selectedEvent: ref({}),
      events: [
          {
            start: '2022-01-10 14:00',
            end: '2022-01-10 18:00',
            title: 'Editable',
            content: 'Click to see my shopping list',
            contentFull: 'My shopping list is rather long:<br><ul><li>Avocados</li><li>Tomatoes</li><li>Potatoes</li><li>Mangoes</li></ul>', // Custom attribute.
         },
          {
            start: '2022-01-10 18:00',
            end: '2022-01-10 19:00',
            title: 'Not Editable',
            content: 'Click to see my shopping list',
            contentFull: 'My shopping list is rather long:<br><ul><li>Avocados</li><li>Tomatoes</li><li>Potatoes</li><li>Mangoes</li></ul>', // Custom attribute.
            deletable: false,
            resizable: false,
            draggable: false
         },
      ]
    }
  },


  methods: {

    getEventsInRange(start, end) {
        console.log(start, end)
    },

    // onEventCreate (event, deleteEventFunction) {
    //     // You can modify event here and return it.
    //     // You can also return false to reject the event creation.
    //     return event
    // },

    selectEvent (event, e) {
      this.selectedEvent = event
      this.showModal = true

      // Prevent navigating to narrower view (default vue-cal behavior).
      e.stopPropagation()
    }
  }
}
</script>


<style>
.vuecal__event {
    background-color: rgba(173, 216, 230, 0.5);
    border-bottom: .5px solid rgba(173, 216, 230, 0.8);
}
</style>
