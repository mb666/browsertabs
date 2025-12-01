<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-10 text-white" dark>
    <q-header class="bg-grey-10 text-white shadow-1">
      <q-toolbar>
        <q-toolbar-title>Browser Tabs</q-toolbar-title>

        <q-space />

        <q-chip color="primary" text-color="white" square> v{{ appVersion }} </q-chip>
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-10 text-white">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
/* global __APP_VERSION__ */
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MainLayout',

  data() {
    return {
      appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    }
  },

  mounted() {
    this.$q.dark.set(true)
  },
})
</script>
