<script setup lang="js">
import {NAvatar, NButton, NForm, NFormItem, NIcon, NMention, TreeSelectOption, useNotification} from "naive-ui";
  import {ArrowPathIcon} from "@heroicons/vue/20/solid";
  import {h, onMounted, Ref, ref} from "vue";
  import { ipcRenderer } from 'electron';

  import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";

  const notification = useNotification();
  const createForm = null;

  // Refs
  let clickUpItems: Ref<ClickUpItem[]> = ref([]);

  let loadingClickupSpaces = ref(false);
  let loadingClickupLists = ref(false);
  let loadingClickupCards = ref(false);

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

  ipcRenderer.on("set-clickup-lists", (
      //event, lists
      ) => {
      onClickupListsRefreshed(
          //lists
      )
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

  ipcRenderer.on("set-clickup-cards", (
      //event, cards
      ) => {
        onClickupCardsRefreshed(
            //cards
        )
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
  | TREE SELECT CHANGE HANDLER
  |--------------------------------------------------------------------------
   */

  function handleTreeSelectChange(option: TreeSelectOption) {
    //TODO: handle tree select change

    console.log("Tree select changed")
    console.dir(option)

    //What is in tree select option?
    /*
    console.log("Tree select changed")
    console.dir(option)
    switch (option.type) {
      case ClickUpType.SPACE:
        getClickupLists(option.id)
        break
      case ClickUpType.LIST:
        getClickupCards(option.id)
        break
      case ClickUpType.TASK:
        //selectedItem = option
        break
      default:
        console.error("Unknown type")
    }

     */
  }

  /*
  |--------------------------------------------------------------------------
  | FETCH CLICKUP SPACES FOR SELECT FIELD
  |--------------------------------------------------------------------------
   */

  function getClickupSpaces() {
    loadingClickupSpaces.value = true;
    ipcRenderer.send("get-clickup-spaces");

    console.info("Fetching Clickup spaces (from cache when available)...");
  }

  function refreshClickupSpaces() {
    loadingClickupSpaces.value = true;
    ipcRenderer.send("refresh-clickup-spaces");

    console.info("Refreshing Clickup spaces...");
  }

  function onClickupSpacesRefreshed(spaces: any[]) {

    // Compare the new spaces ID with the old ones, and only add the new ones
    spaces = spaces.filter(space => !clickUpItems.value.some(oldSpace => oldSpace.id === space.id))

    for (const space of spaces) {
      let item = new ClickUpItem(space.id, space.name, ClickUpType.SPACE, [])

      clickUpItems.value.push(item)
    }

    loadingClickupSpaces.value = false;

    console.dir(clickUpItems)
    console.info("Clickup spaces refreshed!");
  }

  /*
   |--------------------------------------------------------------------------
   | FETCH CLICKUP LISTS FOR SELECT FIELD
   |--------------------------------------------------------------------------
  */

  /*
  function getClickupLists(spaceId: number) {
    loadingClickupLists.value = true;
    ipcRenderer.send("get-clickup-lists", spaceId);

    console.info("Fetching Clickup lists (from cache when available)...");
  }
  */

  function onClickupListsRefreshed(
      //lists: any[]
  ) {
    // TODO: load lists into the corresponding space
    // turn lists into a list of ClickUpItems
    // add this list to the corresponding clickUpItems space
    /*
    for (const list of lists) {
      clickUpItems.value.find(item => item.id === list.space.id).push({
        type: ClickUpType.LIST,
        id: list.id,
        name: list.name,
        label: list.name,
        children: []
      })
     }
     */
    
    loadingClickupLists.value = false;

    console.dir(clickUpItems)
    console.info("Clickup lists refreshed!");
  }

  /*
    |--------------------------------------------------------------------------
    | FETCH TIME CLICKUP CARDS FOR SELECT FIELD
    |--------------------------------------------------------------------------
    */
  // Instruct background process to get cached clickup cards
  /*
  function getClickupCards(listId: number) {
    // TODO: load cards into the corresponding list

    loadingClickupCards.value = true;

    ipcRenderer.send("get-clickup-cards", listId);

    console.info("Fetching Clickup cards (from cache when available)...");
  }
   */

  /*
    function refreshClickupCards() {
    loadingClickupCards.value = true;
    ipcRenderer.send("refresh-clickup-cards");

    console.info("Refreshing Clickup cards...");
  }
   */



  // Fired when background process sends us the refreshed cards
  function onClickupCardsRefreshed(
      //cards: any[]
  ) {
    /*
    this.clickupCards = cards.map((card) => ({
      value: card.id,
      name: `${card.name}`,
      folder: `${card.folder}`,
      label: `${card.name} ${card.folder}` // Native UI uses this for fuzzy searching
    }));
    */
    loadingClickupCards.value = false;

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

  function onSuccess(options: any) {
    notification.success({duration: 5000, ...options});
  }

  function onError(options: any) {
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

  function renderMentionLabel(option: any) {
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
        @update:value = "handleTreeSelectChange"
      />

      <!-- Refresh button -->
      <n-button :disabled="loadingClickupSpaces" circle class="mt-0.5 bg-transparent color-gray-600"
                secondary
                strong
                @click="refreshClickupSpaces"
      >
        <n-icon class="flex items-center justify-center" name="refresh" size="20">
          <div v-if="loadingClickupSpaces" class="w-2 h-2 bg-blue-800 rounded-full animate-ping"></div>
          <arrow-path-icon v-else/>
        </n-icon>
      </n-button>
    </div>

    <!-- Description textbox -->
    <n-form-item :show-label="false" path="description">
      <n-mention
          v-model:value="formValue.task.description"
          :options="mentionable"
          :render-label="renderMentionLabel"
          placeholder="Describe what you worked on"
          type="textarea"
      />
    </n-form-item>
  </n-form>
  <!-- Buttons
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
  -->
</template>

<style scoped>

</style>