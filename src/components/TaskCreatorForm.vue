<script setup >
  import {NAvatar, NButton, NForm, NTreeSelect, NIcon, NMention, NH1, useNotification} from "naive-ui";
  import {ArrowPathIcon} from "@heroicons/vue/20/solid";
  import {h, onMounted, ref} from "vue";
  import { ipcRenderer } from 'electron';

  import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";

  const notification = useNotification();
  const createForm = null;

  // Refs
  let clickUpItems = ref([]);

  let loadingClickup = ref(false);

  //let selectedItem: ClickUpItem;

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

  // IPC event handlers
  // Space handlers
  ipcRenderer.on("set-clickup-spaces", (event, spaces) => {
      onClickupSpacesRefreshed(spaces)
      onSuccess({
        title: "Clickup spaces refreshed",
        content: "Clickup spaces have been refreshed in the background",
      })
    }
  );

  ipcRenderer.on("fetch-clickup-spaces-error", (event, error) =>
      onError({
        error,
        title: "Failed to fetch Clickup spaces in the background",
        content: "You can try again later by pressing the refresh button when searching for a space",
      })
  );

  // List handlers
  ipcRenderer.on("set-clickup-lists", (event, lists) => {
      onClickupListsRefreshed(lists)
      onSuccess({
        title: "Clickup lists refreshed",
        content: "Clickup lists have been refreshed in the background",
      })
    }
  );

  ipcRenderer.on("fetch-clickup-lists-error", (event, error) =>
      onError({
        error,
        title: "Failed to fetch Clickup lists in the background",
        content: "You can try again later by pressing the refresh button when searching for a list",
      })
  );

  // Card handlers
  ipcRenderer.on("set-clickup-cards", (event, cards) => {
        onClickupCardsRefreshed(cards)
        onSuccess({
          title: "Clickup tasks refreshed",
          content: "Clickup tasks have been refreshed in the background",
        })
      }
  );

  ipcRenderer.on("fetch-clickup-cards-error", (event, error) =>
      onError({
        error,
        title: "Failed to fetch Clickup tasks in the background",
        content: "You can try again later by pressing the refresh button when searching for a task",
      })
  );


  /*
  |--------------------------------------------------------------------------
  | TREE SELECT HANDLERS
  |--------------------------------------------------------------------------
   */

  function handleLoad(option) {
    console.log("Loading children for " + option)

    let foundItem = clickUpItems.value.find(item => item.id == option)

    //What is in tree select option?
    switch (foundItem.type) {
      case ClickUpType.SPACE:
        return getClickupLists(option)
      case ClickUpType.LIST:
        getClickupCards(option)
        break
      case ClickUpType.TASK:
        //selectedItem = option
        break
      default:
        console.error("Unknown type")
        return Promise.reject()
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FETCH CLICKUP SPACES FOR SELECT FIELD
  |--------------------------------------------------------------------------
   */

  function getClickupSpaces() {
    loadingClickup.value = true;
    ipcRenderer.send("get-clickup-spaces");

    console.info("Fetching Clickup spaces (from cache when available)...");
  }

  function refreshClickupSpaces() {
    loadingClickup.value = true;
    ipcRenderer.send("refresh-clickup-spaces");

    console.info("Refreshing Clickup spaces...");
  }

  function onClickupSpacesRefreshed(spaces) {
    // Compare the new spaces ID with the old ones, and only add the new ones
    spaces = spaces.filter(space => !clickUpItems.value.some(oldSpace => oldSpace.id === space.id))

    spaces.forEach(space => {
      clickUpItems.value.push(new ClickUpItem(space.id, space.name, ClickUpType.SPACE, []))
    })

    loadingClickup.value = false;
    console.info("Clickup spaces refreshed!");
  }

  /*
   |--------------------------------------------------------------------------
   | FETCH CLICKUP LISTS FOR SELECT FIELD
   |--------------------------------------------------------------------------
  */

  function getClickupLists(spaceId) {
    return new Promise((resolve, reject) => {
      loadingClickup.value = true;
      ipcRenderer.send("get-clickup-lists", spaceId);
      console.info("Fetching Clickup lists (from cache when available)...");

      ipcRenderer.once("set-clickup-lists", (event, lists) => {
        onSuccess({
          title: "Clickup lists refreshed",
          content: "Clickup lists have been refreshed in the background",
        })
        return onClickupListsRefreshed(lists)
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

  function onClickupListsRefreshed(lists) {
    //Set options to track what is pressent in the tree select, after that return the lists as ClickUpItems
    lists = lists.filter(list => !clickUpItems.value.some(oldList => oldList.id === list.id))

    let newLists = lists.map(list => new ClickUpItem(list.id, list.name, ClickUpType.LIST, []))

    lists.forEach(list => {
      clickUpItems.value.find(item => item.id === lists[0].space.id)
          .addChild(new ClickUpItem(list.id, list.name, ClickUpType.LIST, []))

    })

    loadingClickup.value = false;

    console.dir(clickUpItems)
    console.info("Clickup lists refreshed!");

    return newLists
  }

  /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */
  // Instruct background process to get cached clickup cards

  function getClickupCards(listId) {
    loadingClickup.value = true;

    ipcRenderer.send("get-clickup-cards", listId);

    console.info("Fetching Clickup cards (from cache when available)...");
  }

  // Fired when background process sends us the refreshed cards
  function onClickupCardsRefreshed(cards) {
    cards = cards.filter(card => !clickUpItems.value.some(oldCard => oldCard.id === card.id))

    cards.forEach(card => {
      clickUpItems.value.find(item => item.id === cards[0].list.id)
          .addChild(new ClickUpItem(card.id, card.name, ClickUpType.TASK, []))
    })

    loadingClickup.value = false;

    console.dir(clickUpItems)
    console.info("Clickup cards refreshed!");
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
    getClickupSpaces()
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

      <n-tree-select
          :on-load="handleLoad"
          :multiple="false"
          :options="clickUpItems"
      />

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
            @click="cancelTaskCreation()"
        >Cancel</n-button>
        <n-button
            round
            type="primary"
            @click="createTask"
        >Create</n-button>
      </div>
  </n-form>
</template>

<style scoped>

</style>