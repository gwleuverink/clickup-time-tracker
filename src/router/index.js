import { createRouter, createWebHashHistory } from 'vue-router'
import TimeTracker from '@/views/TimeTracker.vue'
import Settings from '@/views/Settings.vue'

const routes = [
  {
    path: '/',
    name: 'time-tracker',
    component: TimeTracker
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
