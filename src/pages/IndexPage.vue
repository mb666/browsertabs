<template>
  <q-page class="q-pa-md bg-grey-10 text-white">
    <q-card flat dark class="bg-dark text-white">
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-h6">
            Shared Worker Connections
            <span v-if="currentConnectionId"> - Tab {{ currentConnectionId }}</span>
          </div>
          <div class="text-caption text-grey-4">
            Shows live state of tabs connected to the browser shared worker. Helps to understand how
            quickly your browser reduces performance on inactive tabs. Keeps track of tab
            visibility. Nominates the oldest active tab as primary. Keeps track of connection times
            and pings.
          </div>
        </div>
        <div>
          <q-chip color="primary" text-color="white" square> Time {{ nowFormatted }} </q-chip>
        </div>
      </q-card-section>
      <TabsTable
        :rows="rows"
        :current-connection-id="currentConnectionId"
        :now-timestamp="nowTimestamp"
      />
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import moment from 'moment'
import TabsTable from 'src/components/TabsTable.vue'
import { SHARED_WORKER_EVENTS_KEY, SHARED_WORKER_KEY } from 'src/boot/shared-worker-client'

export default defineComponent({
  name: 'IndexPage',
  components: {
    TabsTable,
  },
  inject: {
    worker: { from: SHARED_WORKER_KEY, default: null },
    workerEvents: { from: SHARED_WORKER_EVENTS_KEY, default: null },
  },
  data() {
    return {
      rows: [],
      nowFormatted: '',
      nowTimestamp: Date.now(),
      currentConnectionId: null,
      baseTitle: 'Shared Worker Connections',
    }
  },
  methods: {
    updateNow() {
      this.nowTimestamp = Date.now()
      this.nowFormatted = moment(this.nowTimestamp).format('HH:mm:ss')
    },
    updateRows(connections) {
      this.rows = (connections ?? []).map((connection) => ({
        connectionId: connection.connectionId,
        connectedAt: connection.connectedAt,
        lastPing: this.getLastPing(connection.pings),
        pingSeries: this.getPingSeries(connection.pings),
        isTabHidden: connection.isTabHidden,
        isPrimary: !!connection.isPrimary,
      }))
    },
    getLastPing(pings) {
      if (!Array.isArray(pings) || pings.length < 2) {
        return null
      }
      return pings[pings.length - 1] - pings[pings.length - 2]
    },
    getPingSeries(pings) {
      if (!Array.isArray(pings) || pings.length < 2) {
        return Array(100).fill(null)
      }
      const series = []
      for (let i = 1; i < pings.length; i += 1) {
        series.push(pings[i] - pings[i - 1])
      }
      while (series.length < 100) {
        series.unshift(null)
      }
      return series.slice(-100)
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
