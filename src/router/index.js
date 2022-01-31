import { createRouter, createWebHashHistory } from 'vue-router'
import TimeTracker from '@/views/TimeTracker.vue'

const routes = [
  {
    path: '/',
    name: 'TimeTracker',
    component: TimeTracker
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
