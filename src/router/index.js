import { createRouter, createWebHashHistory } from 'vue-router'
import TimeTracker from '@/views/TimeTracker.vue'
import UserSettings from '@/views/UserSettings.vue'
import TeamMemberEntries from '@/views/TeamMemberEntries.vue'

const Store = require('electron-store')
const store = new Store

const routes = [
  {
    path: '/',
    name: 'time-tracker',
    component: TimeTracker,
    beforeEnter: (to, from, next) => {
        // Redirect to settings view if required settings are not set
        if(store.get('settings.clickup_access_token') && store.get('settings.clickup_team_id')) {
            return next()
        }

        next({ name: 'settings' })
    }
  },
  {
    path: '/team/:userId',
    name: 'team',
    component: TeamMemberEntries,
    beforeEnter: (to, from, next) => {
        // Redirect to settings view if required settings are not set
        if(store.get('settings.admin_features_enabled')) {
            return next()
        }

        next({ name: 'time-tracker' })
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: UserSettings
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
