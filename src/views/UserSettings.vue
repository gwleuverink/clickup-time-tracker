<template>
  <!-- START | Drag handle -->
  <div class="h-6" style="-webkit-app-region: drag"></div>
  <!-- END | Drag handle -->

  <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
    <n-form ref="form" :model="model" :rules="rules" size="large">
      <n-form-item label="ClickUp Access token" path="clickup_access_token" placeholder="pk_">
        <n-input v-model:value="model.clickup_access_token" clearable/>
      </n-form-item>

      <n-form-item label="ClickUp Team ID" path="clickup_team_id">
        <n-input v-model:value="model.clickup_team_id" clearable/>
      </n-form-item>

      <div class="flex space-x-4">
        <n-form-item class="flex-grow" label="Day starts at" path="day_start">
          <n-time-picker
              v-model:value="model.day_start"
              :actions="['confirm']"
              class="w-full"
              default-formatted-value="8:00" format="H:00"
          />
        </n-form-item>

        <n-form-item class="flex-grow" label="Day ends at" path="day_end">
          <n-time-picker
              v-model:value="model.day_end"
              :actions="['confirm']"
              class="w-full"
              default-formatted-value="18:00" format="H:00"
          />
        </n-form-item>
      </div>

      <!-- START | Feature toggles -->
      <div class="relative p-4 bg-white border rounded-lg shadow-sm">

        <label class="absolute px-1.5 bg-white -left-0.5 -top-3">Optional features</label>

        <n-form-item :show-feedback="false" :show-label="false" path="show_weekend">
          <n-switch v-model:value="model.show_weekend" :default-value="true"/>
          <label class="ml-3 text-gray-800">Show weekends</label>
        </n-form-item>

        <n-form-item :show-feedback="false" :show-label="false" path="require_description">
          <n-switch v-model:value="model.require_description" :default-value="false"/>
          <label class="ml-3 text-gray-800">Require descriptions</label>
        </n-form-item>

        <n-form-item :show-feedback="false" :show-label="false" path="admin_features_enabled">
          <n-switch v-model:value="model.admin_features_enabled" :default-value="false"/>
          <label class="ml-3 text-gray-800">
            Enable admin features
            <div class="text-sm text-gray-500">You must be a CU admin to use this</div>
          </label>
        </n-form-item>
        <hr class="my-6"/>
        <!-- END | Feature toggles -->

        <!-- START | Styling -->
        <label class="absolute px-1.5 bg-white -ml-4 -mt-9">Style</label>

        <n-form-item label="Background image url (optional)" path="background_image_url">
          <n-input v-model:value="model.background_image_url" clearable/>
        </n-form-item>

        <label class="text-gray-800">Color of tracking entries</label>
        <div class="grid grid-cols-2 gap-4 w-full">
          <n-form-item :show-feedback="false" :show-label="false" path="custom_color_enabled">
            <n-switch
                v-model:value="model.custom_color_enabled"
                @update:value="setDefaultColor"
            />
            <label class="ml-3 text-gray-800">Enable custom color</label>
          </n-form-item>

          <n-form-item :show-label="false" :show-feedback="false" class="w-full" path="color">
            <n-color-picker
                v-model:value="model.color"

                :disabled="!(model.custom_color_enabled)"
                :modes="['hex']"
                class="w-full"
            />
          </n-form-item>
        </div>


        <hr class="my-6"/>
        <!-- END | Styling -->

        <!-- START | Danger zone -->
        <label class="absolute px-1.5 bg-white -ml-4 -mt-9">Danger zone</label>
        <n-popconfirm :show-icon="false" @positive-click="flushCaches">
          <template #activator>
            <n-button secondary size="small" type="warning">
              Flush caches
            </n-button>
          </template>

          This will clear all locally cached<br/>
          ClickUp tasks & team members

        </n-popconfirm>
        <!-- END | Danger zone -->

      </div>

      <div class="flex justify-end mt-4 space-x-2">
        <n-button round @click="cancel">Cancel</n-button>
        <n-button round type="primary" @click="persist">Save</n-button>
      </div>

    </n-form>

    <div class="flex flex-col p-3 space-y-4 shadow-inner bg-gray-50">
      <h2 class="text-lg font-bold text-gray-700">Instructions</h2>
      <p>Click & drag in order to create a new tracking entry</p>

      <h2 class="text-lg font-bold text-gray-700">Keybindings</h2>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + D
        </kbd>
        Duplicate the selected entry
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ +
          <backspace-icon class="w-4 ml-1"/>
        </kbd>
        Delete the selected entry
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + X
        </kbd>
        Refresh background image cache
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + R
        </kbd>
        Refresh the current screen (for troubleshooting)
      </div>

      <div class="flex">
        <kbd
            class="inline-flex items-center px-2 mr-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + V
        </kbd>
        alias for
        <kbd
            class="inline-flex items-center px-2 ml-2 font-sans text-sm font-medium text-gray-400 border border-gray-300 rounded ">
          ⌘ + D
        </kbd>
      </div>

    </div>
  </div>
</template>

<script>
import {ref} from "vue";
import {useRouter} from "vue-router";
import {
  NForm,
  NFormItem,
  NInput,
  NTimePicker,
  NSwitch,
  NButton,
  NPopconfirm,
  NColorPicker,
  useNotification
} from "naive-ui";
import {BackspaceIcon} from "@heroicons/vue/24/outline";
import clickupService from '@/clickup-service';
import store from "@/store";
import cache from "@/cache";

export default {
  components: {NForm, NFormItem, NInput, NTimePicker, NSwitch, NButton, NPopconfirm, BackspaceIcon, NColorPicker},

  setup() {
    const form = ref(null);
    const router = useRouter();
    const notification = useNotification();
    const model = ref(store.get("settings") || {});
    let custom_color = ref(false);

    function mustFlushCachesAfterPersist() {
      // Either the CU acces token or team id has changed
      return model.value.clickup_access_token !== store.get('settings.clickup_access_token')
          || model.value.clickup_team_id !== store.get('settings.clickup_team_id')
    }

    return {
      form,
      model,
      custom_color,

      persist() {
        form.value
            .validate()
            .then(() => {

              if (mustFlushCachesAfterPersist()) {
                cache.flush();
              }

              store.set({settings: model.value});

              router.replace({name: "time-tracker"});

              notification.success({title: "Settings saved!", duration: 1500});
            })
            .catch((errors) => console.error(errors));
      },

      cancel() {
        router.replace({name: "time-tracker"});
      },

      flushCaches() {
        cache.flush()

        notification.success({title: "All caches flushed!", duration: 1500});
      },

      setDefaultColor(event) {
        if (!event) {
          model.value.color = "#ADD8E67F";
        }
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
