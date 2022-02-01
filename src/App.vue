<template>
  <n-config-provider :theme-overrides="theme">
  <n-notification-provider>

    <router-view/>

  </n-notification-provider>
  </n-config-provider>
</template>

<script>
import { NConfigProvider, NNotificationProvider } from 'naive-ui'
import '@/assets/tailwind.css'

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


<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.n-notification__avatar {
    display: flex;
    align-items: center;
}
</style>
