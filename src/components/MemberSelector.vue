<template>
  <Transition name="member-selector">
    <div v-show="open" class="member-selector select-none flex fixed top-0 inset-x-0 z-10 bg-white shadow-inner drop-shadow-xl h-[80px]">

        <!-- START: Loading state -->
        <div v-if="loading" class="self-center w-full text-center">
            Hold on, fetching users in your workspaces...
        </div>

        <!-- START: Empty state -->
        <div v-if="!loading && !users.length" class="self-center w-full text-center">
            Looks like there are no users in your oganization
        </div>

        <!-- START: Avatars -->
        <div v-if="!loading && users.length" class="flex items-end h-full px-2 pb-1 mx-auto overflow-x-scroll avatars-container">

            <n-tooltip v-for="user in users" :key="user.id" trigger="hover">
                <template #trigger>
                    <div class="relative">

                        <router-link
                            :to="{ name: 'team', params: { userId: user.id } }"
                            class=""
                            replace
                        >
                            <n-avatar
                                :src="user.profilePicture"
                                :size="48"
                                class="mx-1 transition shrink-0 hover:scale-125"
                                round
                            >
                                <slot v-if="!user.profilePicture" name="placeholder">{{ user.initials }}</slot>
                            </n-avatar>
                        </router-link>

                        <span v-show="active == user.id" class="absolute inset-x-0 bottom-0 w-full h-0.5 -mb-1 bg-cyan-700"></span>

                    </div>
                </template>

                {{ user.username }}
                <span class="block text-xs">
                    {{ user.email }}
                </span>
            </n-tooltip>

        </div>

    </div>
  </Transition>
</template>

<script>
import { NAvatar, NTooltip } from "naive-ui"
import { ref, watch, onMounted } from "vue"
import clickupService from '@/clickup-service';
import { RouterLink } from "vue-router";

export default {
  props: {
    open: Boolean,
    active: String
  },

  components: { RouterLink, NAvatar, NTooltip },

  setup(props) {

    let loading = ref(true);
    let users = ref([]);

    onMounted(() => fetchUsers())

    const fetchUsers = function() {
        loading.value = true

        clickupService
            .getUsers()
            .then(result => {
                users.value = result
                loading.value = false
            })
    }

     watch(() => props.open, open => {

        // We need to also slide down the entire calendar so things look nice
        const vueCalRoots = document.getElementsByClassName('vuecal')

        if(! vueCalRoots.length) return;

        if(open) {
            return vueCalRoots[0].classList.add('vuecal--member-selector-open')
        }

        return vueCalRoots[0].classList.remove('vuecal--member-selector-open')
    })

    return {
        loading,
        users,
        fetchUsers
    }
  }
};
</script>

<style>
.member-selector {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    -webkit-app-region: drag
}

/* Member selection transition */
.member-selector-enter-active {
    transition: all 0.2s ease;
}

.member-selector-leave-active {
    transition: all 0.2s ease;
}

.member-selector-enter-from,
.member-selector-leave-to {
    top: -80px;
    opacity: 0;
}

/* VueCal top margin transition */
.vuecal {
    transition: all 0.2s ease;
}
.vuecal.vuecal--member-selector-open {
    margin-top: 80px
}

/* Hide scrollbar */
.avatars-container::-webkit-scrollbar {
  display: none;
}

/* Sharper interpolation */
.avatars-container img {
    image-rendering:optimizeQuality;
}
</style>
