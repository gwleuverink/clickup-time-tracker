<script setup>
import {NAvatar, NButton, NForm, NIcon, NMention, NH1, NTreeSelect, NFormItem, useNotification, NConfigProvider} from "naive-ui";
import {ArrowPathIcon} from "@heroicons/vue/20/solid";
import {Planet, List, } from '@vicons/ionicons5'
import {CircleFilled} from "@vicons/carbon";
import {h, onMounted, ref, defineEmits} from "vue";
import {ipcRenderer} from 'electron';
import clickupService from "@/clickup-service";
import store from "@/store";

const props = defineProps({
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
})

const notification = useNotification();

// Emits
const emit = defineEmits(['close', 'create']);

// Refs
let clickUpItems = ref([]);
let loadingClickup = ref(false);
let mentionable = ref([]);

let createForm = ref(null);

let formValue = ref({
  task: {
    taskId: null,
    description: null,
  },
})

const rules = ref({
  task: {
    taskId: {
      required: true,
      message: 'Please select a task'
    },
    description: {
      required: store.get('settings.requireDescription'),
      message: 'Please describe what you worked on',
      trigger: ['blur']
    },
  },
})

// Naive UI custom theme

/**
 * Use this for type hints under js file
 * @type import('naive-ui').GlobalThemeOverrides
 */
const customTheme = {
  common: {
    "textColorDisabled": "-n-text-color"
  }
}


/*
|--------------------------------------------------------------------------
| CASCASER HANDLERS
|--------------------------------------------------------------------------
 */

// A function that builds the cascader options. loops through the clickupItems and builds the options
async function getClickUpHierarchy() {
  loadingClickup.value = true;
  new Promise((resolve, reject) => {
    ipcRenderer.send("get-clickup-hierarchy");
    console.info("Fetching Clickup hierarchy (from cache when available)...");
    ipcRenderer.once("set-clickup-hierarchy", (event, hierarchy) => {
      resolve(hierarchy)
    });

    ipcRenderer.once("fetch-clickup-hierarchy-error", (event, error) => {
      onError({
        error,
        title: "Failed to fetch Clickup hierarchy in the background",
        content: "You can try again later by pressing the refresh button when searching for a space",
      })
      reject();
    });

  }).then((hierarchy) => {
    clickUpItems.value = hierarchy
    onSuccess({
      title: "Clickup hierarchy refreshed",
      content: "The Clickup hierarchy has been refreshed in the background",
    })
    loadingClickup.value = false;
  })
}

async function refreshClickUpHierarchy() {
  loadingClickup.value = true;
  new Promise((resolve, reject) => {
    ipcRenderer.send("refresh-clickup-hierarchy");
    console.info("Fetching Clickup hierarchy (from cache when available)...");
    ipcRenderer.once("set-clickup-hierarchy", (event, hierarchy) => {
      resolve(hierarchy)
    });

    ipcRenderer.once("fetch-clickup-hierarchy-error", (event, error) => {
      onError({
        error,
        title: "Failed to fetch Clickup hierarchy in the background",
        content: "You can try again later by pressing the refresh button when searching for a space",
      })
      reject();
    });

  }).then((hierarchy) => {
    clickUpItems.value = hierarchy
    onSuccess({
      title: "Clickup hierarchy refreshed",
      content: "The Clickup hierarchy has been refreshed in the background",
    })
    loadingClickup.value = false;
  })
}

/*
|--------------------------------------------------------------------------
| BUTTON HANDLERS
|--------------------------------------------------------------------------
*/


function createTask() {
  createForm.value?.validate((errors) => {
    if (errors) {
      console.error('Form validation failed:', errors);
      onError({
        title: 'Form validation failed',
        content: 'Please check the form for errors',
      })
    } else {
      pushToClickup()
      onSuccess({
        title: 'Task created',
        content: 'The task has been created in Clickup',
      });

    }
  })

  const pushToClickup = () => {
    clickupService.createTimeTrackingEntry(
        formValue.value.task.taskId,
        formValue.value.task.description,
        props.start,
        props.end
    ).then(entry => {
      pushEntryToCalendar(entry);
    }).catch(error => {
          cancelTaskCreation()
          this.error({
            error,
            title: "Looks like something went wrong",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
          });
        });
  }
}

function pushEntryToCalendar(entry) {
  console.log('Pushing entry to calendar')
  emit('create', entry);
}

function cancelTaskCreation() {
  emit('close');
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION HANDLERS
|--------------------------------------------------------------------------
*/

// eslint-disable-next-line no-unused-vars
function onSuccess(options) {
  notification.success({duration: 5000, ...options});
}

function onError(options) {
  notification.error({duration: 5000, ...options});

  if (options.error) {
    console.error(options.error);
  }
}

/*
|--------------------------------------------------------------------------
| MISC & EASTER EGG LAND
|--------------------------------------------------------------------------
*/

function renderMentionLabel(option) {
  return h('div', {style: 'display: flex; align-items: center;'}, [
    h(NAvatar, {
      style: 'margin-right: 8px;',
      size: 24,
      round: true,
      src: option.avatar
    }, option.avatar ? '' : option.initials,),
    option.value
  ])
}

function renderSwitcherIcon(option) {
  // Opion.option = id, label, leaf, name, type, value
  let icon = null;


  switch (option.option.type) {
    case 'space':
      icon = Planet
      break;
    case 'list':
      icon = List;
      break;
    default:
      icon = CircleFilled;
      break;
  }

  return h(NIcon, { size: '15px', id: 'cascader-icon' }, { default: () => h(icon) })
}

function onUpdateIndeterminateKeys(keys) {
  console.log(keys);
}

/*
|--------------------------------------------------------------------------
| MAIN
|--------------------------------------------------------------------------
*/

// Fetch Clickup spaces on mount
onMounted(async () => {
  await getClickUpHierarchy()
})
</script>

/*
|--------------------------------------------------------------------------
| TEMPLATE
|--------------------------------------------------------------------------
*/

<template>
  <n-form
      ref="createForm"
      :model="formValue.task"
      :rules="rules.task"
      size="large"
  >
    <n-h1>What are you working on?</n-h1>

    <div class="flex space-x-2">
      <n-form-item path="taskId" class="flex-grow" :show-label="false">
        <n-config-provider class="flex-grow" :theme-overrides="customTheme">
          <n-tree-select
              v-model:value="formValue.task.taskId"
              :options="clickUpItems"
              :disabled="loadingClickup"
              :placeholder="
                loadingClickup
                  ? 'Loading tasks...'
                  : 'Select a task or subtask'
              "

              :size="'large'"
              :clearable="true"
              :expand-trigger="'hover'"
              :filterable="true"
              :key-field="'value'"
              :disabled-field="'disable'"
              :render-prefix="renderSwitcherIcon"

              @update:indeterminate-keys="onUpdateIndeterminateKeys"
          />

        </n-config-provider>
      </n-form-item>

      <!-- Refresh button -->
      <n-button
          :disabled="loadingClickup"
          circle
          class="mt-0.5 bg-transparent color-gray-600"
          secondary
          strong
          @click="refreshClickUpHierarchy"
      >
        <n-icon class="flex items-center justify-center" name="refresh" size="20">
          <div v-if="loadingClickup" class="w-2 h-2 bg-blue-800 rounded-full animate-ping"></div>
          <arrow-path-icon v-else/>
        </n-icon>
      </n-button>
    </div>

    <!-- Description textbox -->
    <div class="flex space-x-2">
      <n-form-item path="description" class="flex-grow" :show-label="false">
        <n-mention
            v-model:value="formValue.task.description"
            :options="mentionable"
            :render-label="renderMentionLabel"
            placeholder="Describe what you worked on"
            type="textarea"
            :disabled="loadingClickup"
        />
      </n-form-item>
    </div>

    <!-- Create and cancel buttons -->
    <div class="flex justify-end space-x-2">
      <n-button
          round
          @click="cancelTaskCreation"

      >Cancel
      </n-button>
      <n-button
          round
          type="primary"
          @click="createTask"
      >Create
      </n-button>
    </div>
  </n-form>
</template>

<style scoped>

</style>