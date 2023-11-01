<script setup>
import {NAvatar, NButton, NForm, NIcon, NMention, NH1, //NCascader,
 useNotification} from "naive-ui";
import {ArrowPathIcon} from "@heroicons/vue/20/solid";
import {h, onMounted, ref} from "vue";
import {ipcRenderer} from 'electron';

import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";

const notification = useNotification();
const createForm = null;

// Refs
let clickUpItems = ref([]);
let loadingClickup = ref(false);
//let selectedItem = ref(null);

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
  // Load spaces
  loadingClickup.value = true;
  let hierarchy = new Promise((resolve, reject) => {
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

  })

  return hierarchy
}

/*
|--------------------------------------------------------------------------
| FETCH CLICKUP SPACES FOR SELECT FIELD
|--------------------------------------------------------------------------
 */
/*
function getClickupSpaces() {
  return new Promise((resolve, reject) => {
    ipcRenderer.send("get-clickup-spaces");
    console.info("Fetching Clickup spaces (from cache when available)...");
    ipcRenderer.once("set-clickup-spaces", (event, spaces) => {
      resolve(onClickupSpacesLoaded(spaces))
    });

    ipcRenderer.once("fetch-clickup-spaces-error", (event, error) => {
      onError({
        error,
        title: "Failed to fetch Clickup spaces in the background",
        content: "You can try again later by pressing the refresh button when searching for a space",
      })
      reject();
    });
  });
}

function refreshClickupSpaces() {
  ipcRenderer.send("refresh-clickup-spaces");

  console.info("Refreshing Clickup spaces...");
}

function onClickupSpacesLoaded(spaces) {
  let items = []

  spaces.forEach(space => {
    items.push(new ClickUpItem(space.id, space.name, ClickUpType.SPACE, []))
  })
  return items
}
*/
/*
 |--------------------------------------------------------------------------
 | FETCH CLICKUP LISTS FOR SELECT FIELD
 |--------------------------------------------------------------------------
*/

// eslint-disable-next-line no-unused-vars
function getClickupLists(spaceId) {
  return new Promise((resolve, reject) => {
    ipcRenderer.send("get-clickup-lists", spaceId);
    console.info("Fetching Clickup lists (from cache when available)...");
    ipcRenderer.once("set-clickup-lists", (event, lists) => {
      resolve(onClickupListsLoaded(lists))
    });
    ipcRenderer.once("fetch-clickup-lists-error", (event, error) => {
      onError({
        error,
        title: "Failed to fetch Clickup lists in the background",
        content: "You can try again later by pressing the refresh button when searching for a list",
      })
      reject();
    });

  });
}

function onClickupListsLoaded(lists) {
  let items = []

  lists.forEach(list => {
    items.push(new ClickUpItem(list.id, list.name, ClickUpType.LIST, []))
  })

  return items
}

/*
  |--------------------------------------------------------------------------
  | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
  |--------------------------------------------------------------------------
  */
// Instruct background process to get cached clickup cards

// eslint-disable-next-line no-unused-vars
function getClickupTasks(listId) {
  return new Promise((resolve, reject) => {
    ipcRenderer.send("get-clickup-cards", listId);
    console.info("Fetching Clickup cards (from cache when available)...");
    ipcRenderer.once("set-clickup-cards", (event, cards) => {
      resolve(onClickupTasksLoaded(cards))
    });
    ipcRenderer.once("fetch-clickup-cards-error", (event, error) => {
      onError({
        error,
        title: "Failed to fetch Clickup tasks in the background",
        content: "You can try again later by pressing the refresh button when searching for a task",
      })
      reject();
    });
  });
}

function onClickupTasksLoaded(tasks) {
  let items = []

  tasks.forEach(task => {
    items.push(new ClickUpItem(task.id, task.name, ClickUpType.TASK, []))
  })

  return items
}

/*
|--------------------------------------------------------------------------
| CREATE A TASK
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
onMounted(() => {
  clickUpItems.value = getClickUpHierarchy()
})

</script>

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

      <!--
      <n-cascader
          v-model:value="selectedItem"
          :check-strategy="'child'"
          :options="clickUpItems"
          filterable
          placeholder="Select a task or subtask"
      />
      -->

      <!-- Refresh button -->
      <n-button :disabled="loadingClickup" circle class="mt-0.5 bg-transparent color-gray-600"
                secondary
                strong
                @click="refreshClickupSpaces"
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
      />
    </div>

    <!-- Create and cancel buttons -->
    <div class="flex justify-end space-x-2">
      <n-button
          round
      >Cancel
      </n-button>
      <n-button
          round
          type="primary"
      >Create
      </n-button>
    </div>
  </n-form>
</template>

<style scoped>

</style>