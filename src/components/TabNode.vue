<template>
  <div class="bg-blue-grey-10 text-white q-pa-sm q-border q-rounded-borders">
    <Handle
      id="top"
      type="target"
      :position="Position.Top"
      :style="handleStyle"
      :is-connectable="false"
    />
    <div class="row items-center justify-between q-mb-xs">
      <div class="row items-center q-gutter-xs">
        <q-chip dense square color="blue-grey-7" text-color="white"
          >Tab #{{ data.connectionId }}</q-chip
        >
      </div>
      <div class="row items-center q-gutter-xs">
        <q-chip dense square color="primary" text-color="white" v-if="data.isPrimary"
          >Primary</q-chip
        >
        <q-chip dense square color="blue-grey-7" text-color="white" v-else>Secondary</q-chip>
        <q-chip dense square color="negative" text-color="white" v-if="data.isTabHidden"
          >Hidden</q-chip
        >
        <q-chip dense square color="positive" text-color="white" v-else>Visible</q-chip>
      </div>
    </div>
    <div class="row items-center justify-between text-caption text-grey-4">
      <span>Connected:</span>
      <span>{{ formatAgo(data.connectedAt) }}</span>
    </div>
    <div class="row items-center justify-between text-caption text-grey-4">
      <span>Last Ping:</span>
      <span>{{ formatLastPing(data.lastPing) }}</span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { formatAgo, formatLastPing } from 'src/utils/formatHelper'

export default defineComponent({
  name: 'TabNode',
  components: {
    Handle,
  },
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  data() {
    return { Position }
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
  methods: {
    formatAgo(value) {
      return formatAgo(value, this.data.nowTimestamp)
    },
    formatLastPing(value) {
      return formatLastPing(value)
    },
  },
})
</script>
