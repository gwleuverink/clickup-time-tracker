<template>
    <!-- START | Drag handle -->
    <div class="h-6" style="-webkit-app-region: drag"></div>
    <!-- END | Drag handle -->

    <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">

        <n-form :model="model" :rules="rules" size="large" ref="form">

            <n-form-item label="Clickup Access token" path="clickup_access_token">
                <n-input v-model:value="model.clickup_access_token" clearable />
            </n-form-item>

            <n-form-item label="Clickup Team ID" path="clickup_team_id">
                <n-input v-model:value="model.clickup_team_id" clearable />
            </n-form-item>

            <n-form-item label="Background image url (optional)" path="background_image_url">
                <n-input v-model:value="model.background_image_url" clearable />
            </n-form-item>

            <div class="flex justify-end">
                <n-button @click="persist" type="primary" round>Save</n-button>
            </div>

        </n-form>

        <div class="p-3 space-y-4 shadow-inner bg-gray-50">

            <h2 class="text-lg font-bold text-gray-700">Instructions</h2>
            <p>
                Click & drag in order to create a new tracking entry
            </p>


            <h2 class="text-lg font-bold text-gray-700">Keybindings</h2>

            <div class="flex">
                <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + D</kbd>
                Duplicate the selected entry
            </div>

            <div class="flex">
                <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">
                    ⌘ + <backspace-icon class="w-4 ml-1" />
                </kbd>
                Delete the selected entry
            </div>

            <div class="flex">
                <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + X</kbd>
                Refresh background image cache
            </div>

            <div class="flex">
                <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + R</kbd>
                Refresh the current screen (for troubleshooting)
            </div>

            <div class="flex">
                <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + V</kbd>
                alias for
                <kbd class="inline-flex items-center px-2 ml-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded">⌘ + D</kbd>
            </div>
        </div>

    </div>
</template>

<script>

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, useNotification } from 'naive-ui'
import { BackspaceIcon } from '@heroicons/vue/outline'
import store from '@/store'

export default {

    components: { NForm, NFormItem, NInput,  NButton, BackspaceIcon },

    setup() {

        const form = ref(null)
        const router = useRouter()
        const notification = useNotification()
        const model = ref(store.get('settings') || {})

        return {
            form,

            model,

            persist() {
                form.value.validate().then(() => {
                    store.set({ settings: model.value })

                    router.replace({ name: 'time-tracker' })
                    // router.go()

                    notification.success({ title: 'Settings saved!', duration: 1500 })
                }).catch(errors => console.error(errors))
            },

            rules: {
                clickup_access_token: [
                    {
                        required: true,
                        min: 43,
                        message: 'Please input your Clickup Access Token',
                        trigger: ['input', 'blur']
                    },
                    // TODO: Add async validity checker
                ],
                clickup_team_id: [
                    {
                        required: true,
                        min: 1,
                        message: 'Please input your Clickup Team ID',
                        trigger: ['input', 'blur']
                    },
                    // TODO: Add async validity checker
                ]
            }
        }
    }
}
</script>
