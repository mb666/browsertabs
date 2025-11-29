<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-10 text-white" dark>
    <q-header elevated class="bg-grey-9 text-white">
      <q-toolbar>
        <q-toolbar-title> browser tabs </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-10 text-white">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MainLayout',

  mounted() {
    this.$q.dark.set(true)
  },
})
</script>
