<script setup>
import {NAvatar, NButton, NForm, NIcon, NMention, NH1, NCascader, useNotification} from "naive-ui";
import {ArrowPathIcon} from "@heroicons/vue/20/solid";
import {h, onMounted, ref, defineEmits} from "vue";
import {ipcRenderer} from 'electron';

const notification = useNotification();
const createForm = null;

// Emits
const emit = defineEmits(['close'])

// Refs
let clickUpItems = ref([]);
let loadingClickup = ref(false);
let selectedItem = ref(null);

let mentionable = ref([]);

const formValue = ref({
  task: {
    taskId: null,
    description: null,
  },
})

const rules = ref({
  task: {
    taskId: [
      {required: true, message: 'Please select a task', trigger: 'change'},
    ],
    description: [
      {required: true, message: 'Please describe what you worked on', trigger: 'change'},
    ],
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

/*
function createTask() {
  // TODO: create task, send to clickup, and send close modal event

  /*
  createForm.validate()
      .then(() => pushToClickup())
      .catch(errors => console.error(errors))

  const pushToClickup = () => {
    console.log("Test pushing to Clickup...")
    console.log(selectedItem.value + " " + formValue.value.task.description + " " + this.selectedTask.start + " " + this.selectedTask.end)
    console.log(formValue.value)
    /*
    clickupService.createTimeTrackingEntry(
        this.selectedTask,
        this.formValue.task.description,
        this.selectedTask.start,
        this.selectedTask.end
    ).then(entry => {
          console.info(`Created time tracking entry for: ${entry.task.name}`);

          this.selectedTask = eventFactory.updateFromRemote(
              this.selectedTask,
              entry
          );
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

    // reset form values at the end
    // TODO: update to new form
    this.formValue = {
      task: {
        space: null,
        lists: null,
        taskId: null,
        description: null,
      },
    };
  }
*/

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
      :model="formValue"
      :rules="rules"
      size="large"
  >
    <div class="flex space-x-2">
      <n-h1>What are you working on?</n-h1>
    </div>

    <div class="flex space-x-2">
      <!-- Searchable nest dropdown for Space>lists>task>subtasks-->

      <n-cascader
          v-model:value="selectedItem"
          :options="clickUpItems"
          :disabled="loadingClickup"
          placeholder="Select a task or subtask"

          :clearable="true"
          :check-strategy="'child'"
          :expand-trigger="'hover'"
          :filterable="true"
          :show-path="false"
      />

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
      <n-mention
          v-model:value="formValue.task.description"
          :options="mentionable"
          :render-label="renderMentionLabel"
          placeholder="Describe what you worked on"
          type="textarea"
          :disabled="!selectedItem || loadingClickup"
      />
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
          :disabled="!selectedItem || loadingClickup"
      >Create
      </n-button>
    </div>
  </n-form>
</template>

<style scoped>

</style>