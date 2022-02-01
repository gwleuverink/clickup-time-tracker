<template>
    <v-offline @detected-condition="onlineStatusChanged">
      <slot v-if="online" />

      <template v-else>
        <!-- START | Drag handle -->
        <div class="h-6" style="-webkit-app-region: drag"></div>
        <!-- END | Drag handle -->

        <div class="fixed inset-0 flex flex-col items-center justify-center">
          <status-offline-icon class="h-6 mb-2 text-red-700 -mt-14 w- animate-ping" />

          <h1 class="my-3 font-mono text-3xl italic text-gray-700">You are offline</h1>

          <p>
            check your internet connection and hint
            <kbd class="inline-flex items-center px-2 ml-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + R</kbd>
          </p>
        </div>
      </template>

    </v-offline>


</template>

<script>
import { ref } from 'vue';
import { VOffline } from 'v-offline';
import { StatusOfflineIcon } from "@heroicons/vue/solid"

export default {
    components: {
        VOffline,
        StatusOfflineIcon
    },

    setup() {
        const online = ref(true)

        return {
            online,
            onlineStatusChanged(e) {
                online.value = e
            }
        }
    }
}
</script>
