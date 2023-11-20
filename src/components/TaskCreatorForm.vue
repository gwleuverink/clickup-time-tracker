<script setup>
import {NAvatar, NButton, NForm, NIcon, NMention, NH1, NCascader, NFormItem, useNotification} from "naive-ui";
import {ArrowPathIcon} from "@heroicons/vue/20/solid";
import {h, onMounted, ref, defineEmits} from "vue";
import {ipcRenderer} from 'electron';
import clickupService from "@/clickup-service";
import store from "@/store";

const notification = useNotification();

// Emits
const emit = defineEmits(['close'])

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
      console.log('Form validated');
      console.log(formValue.value.task.taskId);
      console.log(formValue.value.task.description);
      onSuccess({
        title: 'Task created',
        content: 'The task has been created in Clickup',
      });
      cancelTaskCreation();
    }
  })
  //.then(() => pushToClickup())
  // eslint-disable-next-line no-unused-vars
  const pushToClickup = () => {
    clickupService.createTimeTrackingEntry(
        formValue.value.task.taskId,
        formValue.value.task.description,
        this.selectedTask.start,
        this.selectedTask.end
    ).then(entry => {
      console.info(`Created time tracking entry for: ${entry.task.name}`);

      //this.selectedTask = eventFactory.updateFromRemote(this.selectedTask,entry);
      // Explicitly push to model so time update works properly
      this.events.push(this.selectedTask);

      this.closeCreationModal();
    })
        .catch(error => {
          this.cancelTaskCreation();

          this.error({
            error,
            title: "Looks like something went wrong",
            content: "There was a problem while pushing to Clickup. Check your console & internet connection and try again",
          });
        });
  }
}

function cancelTaskCreation() {
  emit('close');
}

// Check selected item from the cascader, if it's a task, or subtask, set the taskId in the formValue
// otherwise, set it to null, not perfect, but it works, would be better to have a changable check-stategy
// on the cascader. Is there a way to do that?

function checkSelection(value, selectedOptions) {
  //value = taskId
  // selectedOptions = "id", "value", "name", "label", "list", "leaf"
  if (selectedOptions) {
    if (!(selectedOptions.leaf)) {
      formValue.value.task.taskId = null;
    }
  }
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
    <div class="flex space-x-2">
      <n-h1>What are you working on?</n-h1>
    </div>

    <div class="flex space-x-2">

      <!-- Searchable nest dropdown for Space>lists>task>subtasks-->
      <!-- TODO: make list not selectable -->
      <n-form-item path="taskId" class="flex-grow">
        <n-cascader
            v-model:value="formValue.task.taskId"
            :options="clickUpItems"
            :disabled="loadingClickup"
            :placeholder="
            loadingClickup
              ? 'Loading tasks...'
              : 'Select a task or subtask'
            "

            :clearable="true"
            :check-strategy="'child'"
            :expand-trigger="'hover'"
            :filterable="true"
            :show-path="false"

            @update:value="checkSelection"
        />
      </n-form-item>


      <!-- Refresh button -->
      <n-button :disabled="loadingClickup" circle class="mt-0.5 bg-transparent color-gray-600"
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
      <n-form-item path="description" class="flex-grow">
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