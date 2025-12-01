<template>
  <div class="bg-blue-grey-10 text-white q-pa-sm q-border q-rounded-borders text-center relative-position">
    <div class="text-subtitle2">Shared Worker</div>
    <div class="text-caption text-grey-4">Active tabs: {{ data.tabCount }}</div>
    <Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      :style="handleStyle"
      :is-connectable="false"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { Handle, Position } from '@vue-flow/core'

export default defineComponent({
  name: 'SharedWorkerNode',
  components: {
    Handle,
  },
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  computed: {
    handleStyle() {
      return {
        width: '12px',
        height: '12px',
        background: '#94a3b8',
        border: '2px solid #1f2933',
      }
    },
  },
  data() {
    return { Position }
  },
})
</script>
