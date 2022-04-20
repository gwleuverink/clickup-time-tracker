import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router'
import '@/assets/tailwind.css'

import * as Sentry from "@sentry/electron";
Sentry.init({ dsn: "https://95612b221173413ab6802b1eed844b76@o1134386.ingest.sentry.io/6181815" });

createApp(App).use(router).mount('#app')
