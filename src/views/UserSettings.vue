<template>
  <!-- START | Drag handle -->
  <div class="h-6" style="-webkit-app-region: drag"></div>
  <!-- END | Drag handle -->

  <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
    <n-form :model="model" :rules="rules" size="large" ref="form">
      <n-form-item label="ClickUp Access token" path="clickup_access_token" placeholder="pk_">
        <n-input v-model:value="model.clickup_access_token" clearable />
      </n-form-item>

      <n-form-item label="ClickUp Team ID" path="clickup_team_id">
        <n-input v-model:value="model.clickup_team_id" clearable />
      </n-form-item>
      <div class="flex space-x-4">
        <n-form-item label="Day starts at" path="day_start" class="flex-grow">
            <n-select
                v-model:value="model.day_start"
                :options="hours"
            >
                <template #arrow>
                    <ClockIcon class="w-4" />
                </template>
            </n-select>
        </n-form-item>

        <n-form-item label="Day ends at" path="day_end" class="flex-grow">
            <n-select
                v-model:value="model.day_end"
                :options="hours"
            >
                <template #arrow>
                    <ClockIcon class="w-4" />
                </template>
            </n-select>
        </n-form-item>
      </div>

      <n-form-item label="Background image url (optional)" path="background_image_url">
        <n-input v-model:value="model.background_image_url" clearable />
      </n-form-item>


      <!-- START | Feature toggles -->
      <div class="relative p-4 bg-white border rounded-lg shadow-sm">

        <label class="absolute px-1.5 bg-white -left-0.5 -top-3">Optional features</label>

        <n-form-item path="show_weekend" :show-label="false" :show-feedback="false">
          <n-switch v-model:value="model.show_weekend" :default-value="true" />
          <label class="ml-3 text-gray-800">Show weekends</label>
        </n-form-item>

        <n-form-item path="require_description" :show-label="false" :show-feedback="false">
          <n-switch v-model:value="model.require_description" :default-value="false" />
          <label class="ml-3 text-gray-800">Require descriptions</label>
        </n-form-item>

        <n-form-item path="admin_features_enabled" :show-label="false" :show-feedback="false">
          <n-switch v-model:value="model.admin_features_enabled" :default-value="false" />
          <label class="ml-3 text-gray-800">
            Enable admin features
            <div class="text-sm text-gray-500">You must be a CU admin to use this</div>
          </label>
        </n-form-item>

        <hr class="my-6" />
        <label class="absolute px-1.5 bg-white -ml-4 -mt-9">Danger zone</label>

        <n-popconfirm @positive-click="flushCaches" :show-icon="false">
            <template #activator>
                <n-button size="small" type="warning" secondary>
                    Flush caches
                </n-button>
            </template>

            This will clear all locally cached<br />
            ClickUp tasks & team members

        </n-popconfirm>

      </div>
      <!-- END | Feature toggles -->


      <div class="flex justify-end mt-4 space-x-2">
        <n-button @click="cancel" round>Cancel</n-button>
        <n-button @click="persist" type="primary" round>Save</n-button>
      </div>

    </n-form>

    <div class="flex flex-col p-3 space-y-4 shadow-inner bg-gray-50">
      <h2 class="text-lg font-bold text-gray-700">Instructions</h2>
      <p>Click & drag in order to create a new tracking entry</p>

      <h2 class="text-lg font-bold text-gray-700">Keybindings</h2>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + D
        </kbd>
        Duplicate the selected entry
      </div>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + <backspace-icon class="w-4 ml-1" />
        </kbd>
        Delete the selected entry
      </div>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + X
        </kbd>
        Refresh background image cache
      </div>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + R
        </kbd>
        Refresh the current screen (for troubleshooting)
      </div>

      <div class="flex">
        <kbd class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + V
        </kbd>
        alias for
        <kbd class="inline-flex items-center px-2 ml-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + D
        </kbd>
      </div>

    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { NForm, NFormItem, NInput, NSelect, NSwitch, NButton, NPopconfirm, useNotification } from "naive-ui";
import { BackspaceIcon, ClockIcon } from "@heroicons/vue/24/outline";
import clickupService from '@/clickup-service';
import store from "@/store";
import cache from "@/cache";

export default {
  components: { NForm, NFormItem, NInput, NSelect, NSwitch, NButton, NPopconfirm, BackspaceIcon, ClockIcon },

  setup() {
    const form = ref(null);
    const router = useRouter();
    const notification = useNotification();
    const model = ref(store.get("settings") || {});
    const hours = ref(Array.from(Array(25).keys()).map((i) => ({ label: `${i}:00`, value: i })));

    function mustFlushCachesAfterPersist() {
        // Either the CU acces token or team id has changed
        return model.value.clickup_access_token !== store.get('settings.clickup_access_token')
            || model.value.clickup_team_id !== store.get('settings.clickup_team_id')
    }

    return {
      form,
      model,
      hours,
      persist() {
        form.value
          .validate()
          .then(() => {

            if(mustFlushCachesAfterPersist()) {
                cache.flush();
            }

            store.set({ settings: model.value });

            router.replace({ name: "time-tracker" });

            notification.success({ title: "Settings saved!", duration: 1500 });
          })
          .catch((errors) => console.error(errors));
      },

      cancel() {
        router.replace({ name: "time-tracker" });
      },

      flushCaches() {
        cache.flush()

        notification.success({ title: "All caches flushed!", duration: 1500 });
      },

      rules: {
        clickup_access_token: [
          {
            required: true,
            min: 43,
            message: "Please input your ClickUp Access Token",
            trigger: ["input", "blur"],
          },
          {
            required: true,
            validator: (rule, value) => clickupService.tokenValid(value),
            message: "This token couldn't be validated with ClickUp. Please verify.",
            trigger: ['blur']
          }
        ],
        clickup_team_id: [
          {
            required: true,
            min: 1,
            message: "Please input your ClickUp Team ID",
            trigger: ["input", "blur"],
          },
          // TODO: Add async validity checker
        ],
        day_start: [
          {
            required: true,
            validator(rule, value) {
                if (Number(value) >= Number(model.value.day_end)) {
                    return new Error("Must be less than the end of day");
                }
                return true;
            },
            trigger: ["input", "blur"],
          },
        ],
        day_end: [
          {
            required: true,
            validator(rule, value) {
                if (Number(value) <= Number(model.value.day_start)) {
                    return new Error("Must be more than the start of day");
                }
                return true;
            },
            trigger: ["input", "blur"],
          },
        ]
      },
    };
  },
};
</script>
