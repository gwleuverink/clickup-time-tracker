<template>
  <n-notification-provider>
    <TimeTracker />
  </n-notification-provider>
</template>

<script>
import TimeTracker from './components/TimeTracker.vue'
import { NNotificationProvider } from 'naive-ui'

export default {
  name: 'App',
  components: {
    TimeTracker,
    NNotificationProvider
  }
}
</script>
