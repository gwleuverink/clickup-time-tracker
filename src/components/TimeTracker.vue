<template>
    <vue-cal
        :disable-views="['years', 'year', 'month']"
        active-view="week"
        today-button
    />
</template>

<script>
// In your Vue.js component.
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'

export default {
  components: { VueCal },
  data: () => ({
  }),
}
</script>
