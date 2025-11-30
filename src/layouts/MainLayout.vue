<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-10 text-white" dark>
    <q-header elevated class="bg-grey-9 text-white">
      <q-toolbar>
        <q-toolbar-title> browser tabs </q-toolbar-title>

        <q-space />

        <div class="text-caption text-weight-medium">v{{ appVersion }}</div>
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
      appVersion:
        typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    }
  },

  mounted() {
    this.$q.dark.set(true)
  },
})
</script>
