import { createRouter, createWebHashHistory } from 'vue-router'
import TimeTracker from '@/views/TimeTracker.vue'

const routes = [
  {
    path: '/',
    name: 'time-tracker',
    component: TimeTracker
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
