<template>
  <q-page class="q-pa-md bg-grey-10 text-white">
    <q-card flat bordered dark class="bg-dark text-white">
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">
            Shared Worker Connections
            <span v-if="currentConnectionId"> - Tab {{ currentConnectionId }}</span>
          </div>
          <div class="text-caption text-grey-4">
            Live state of tabs connected to the browser shared worker.
          </div>
        </div>
        <div>
          <q-chip color="secondary" text-color="white" square>
            {{ nowFormatted }}
          </q-chip>
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
        dark
        bordered
        color="accent"
        table-header-class="bg-grey-9 text-grey-3"
      >
        <template #body="props">
          <q-tr :props="props" :class="getRowClass(props.row)">
            <q-td key="connectionId" :props="props">
              {{ props.row.connectionId }}
            </q-td>
            <q-td key="role" :props="props">
              <q-badge color="primary" text-color="white" v-if="props.row.isPrimary"
                >Primary</q-badge
              >
              <q-badge color="blue-grey-7" text-color="white" v-else>Secondary</q-badge>
            </q-td>
            <q-td key="isTabHidden" :props="props">
              <q-badge color="negative" text-color="white" v-if="props.row.isTabHidden"
                >Hidden</q-badge
              >
              <q-badge color="positive" text-color="white" v-else>Visible</q-badge>
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
  { name: 'connectionId', label: 'Tab ID', field: 'connectionId', align: 'left', sortable: true },
  { name: 'role', label: 'Role', field: 'isPrimary', align: 'left' },
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
      baseTitle: 'Shared Worker Connections',
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
        isPrimary: !!connection.isPrimary,
      }))
    },
    updatePageTitle() {
      if (typeof document === 'undefined') {
        return
      }
      const suffix = this.currentConnectionId ? ` - Tab ${this.currentConnectionId}` : ''
      document.title = `${this.baseTitle}${suffix}`
    },
    handleReady(event) {
      this.currentConnectionId = event?.detail?.connectionId ?? null
      if (this.worker?.connections) {
        this.updateRows(this.worker.connections)
      }
      this.updatePageTitle()
    },
    handleConnections(event) {
      this.updateRows(event.detail)
    },
    getRowClass(row) {
      return row.connectionId === this.currentConnectionId ? 'bg-accent text-white' : null
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
    this.updatePageTitle()
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
