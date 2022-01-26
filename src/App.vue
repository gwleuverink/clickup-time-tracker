<template>
  <n-configProvider :theme-overrides="theme">
  <n-notification-provider>

    <TimeTracker />

  </n-notification-provider>
  </n-configProvider>
</template>

<script>
import TimeTracker from './components/TimeTracker.vue'
import { NConfigProvider, NNotificationProvider } from 'naive-ui'

/**
 * Use this for type hints under js file
 * @type import('naive-ui').GlobalThemeOverrides
 */
const theme = {
    common: {
        primaryColor: '#0284C7',
        primaryColorHover: '#38BDF8',
    }
}

export default {
  name: 'App',
  components: {
    TimeTracker,
    NConfigProvider,
    NNotificationProvider
  },
  setup() {
    return {
      theme
    }
  }
}
</script>
