<template>
  <q-page class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">Shared Worker Connections</div>
          <div class="text-caption text-grey-7">
            Live state of tabs connected to the browser shared worker.
          </div>
        </div>
        <div class="text-subtitle2 text-weight-medium">
          {{ nowFormatted }}
        </div>
      </q-card-section>
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="connectionId"
        flat
        dense
        wrap-cells
        :pagination="{ rowsPerPage: 0 }"
        hide-bottom
        :loading="!rows.length"
      >
        <template #body="props">
          <q-tr :props="props" :class="getRowClass(props.row)">
            <q-td key="connectionId" :props="props">
              {{ props.row.connectionId }}
            </q-td>
            <q-td key="isTabHidden" :props="props">
              <q-badge color="grey-7" v-if="props.row.isTabHidden">Hidden</q-badge>
              <q-badge color="positive" v-else>Visible</q-badge>
            </q-td>
            <q-td key="lastPingAt" :props="props">
              {{ formatLastPing(props.row.lastPingAt) }}
            </q-td>
            <q-td key="lastPingAgo" :props="props">
              {{ formatLastPingAgo(props.row.lastPingAt) }}
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import moment from 'moment'
import { SHARED_WORKER_EVENTS_KEY, SHARED_WORKER_KEY } from 'src/boot/shared-worker-client'

const columns = [
  { name: 'connectionId', label: 'ID', field: 'connectionId', align: 'left', sortable: true },
  { name: 'isTabHidden', label: 'Visibility', field: 'isTabHidden', align: 'left', sortable: true },
  { name: 'lastPingAt', label: 'Last Ping', field: 'lastPingAt', align: 'left', sortable: true },
  { name: 'lastPingAgo', label: 'Last Ping Ago', field: 'lastPingAt', align: 'left' },
]

export default defineComponent({
  name: 'IndexPage',
  inject: {
    worker: { from: SHARED_WORKER_KEY, default: null },
    workerEvents: { from: SHARED_WORKER_EVENTS_KEY, default: null },
  },
  data() {
    return {
      columns,
      rows: [],
      nowFormatted: '',
      nowTimestamp: Date.now(),
      currentConnectionId: null,
    }
  },
  methods: {
    formatLastPing(value) {
      if (!value) {
        return '-'
      }
      return moment(value).format('HH:mm:ss.SSS')
    },
    updateNow() {
      this.nowTimestamp = Date.now()
      this.nowFormatted = moment(this.nowTimestamp).format('HH:mm:ss')
    },
    formatLastPingAgo(value) {
      if (!value) {
        return '-'
      }
      const diffMs = this.nowTimestamp - value
      if (diffMs < 0) {
        return '0 ms'
      }
      if (diffMs < 1000) {
        return `${diffMs} ms`
      }
      return `${Math.round(diffMs / 1000)} s`
    },
    updateRows(connections) {
      this.rows = (connections ?? []).map((connection) => ({
        connectionId: connection.connectionId,
        lastPingAt: connection.lastPingAt,
        isTabHidden: connection.isTabHidden,
      }))
    },
    handleReady(event) {
      this.currentConnectionId = event?.detail?.connectionId ?? null
      if (this.worker?.connections) {
        this.updateRows(this.worker.connections)
      }
    },
    handleConnections(event) {
      this.updateRows(event.detail)
    },
    getRowClass(row) {
      return row.connectionId === this.currentConnectionId ? 'bg-primary text-white' : null
    },
  },
  mounted() {
    this.updateNow()
    this.nowInterval = window.setInterval(this.updateNow, 1000)
    if (this.worker?.connections) {
      this.updateRows(this.worker.connections)
    }
    if (this.worker?.connectionId) {
      this.currentConnectionId = this.worker.connectionId
    }
    this.workerEvents?.addEventListener('ready', this.handleReady)
    this.workerEvents?.addEventListener('connections', this.handleConnections)
  },
  beforeUnmount() {
    if (this.nowInterval) {
      window.clearInterval(this.nowInterval)
    }
    this.workerEvents?.removeEventListener('ready', this.handleReady)
    this.workerEvents?.removeEventListener('connections', this.handleConnections)
  },
})
</script>
