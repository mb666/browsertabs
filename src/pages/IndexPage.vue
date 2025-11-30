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
      <q-table
        ref="connectionsTable"
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
            <q-td key="connectedAgo" :props="props">
              {{ formatAgo(props.row.connectedAt) }}
            </q-td>
            <q-td key="lastPing" :props="props"> {{ formatLastPing(props.row.lastPing) }}ms </q-td>
            <q-td key="pingSparkline" :props="props">
              <Sparkline
                v-if="Array.isArray(props.row.pingSeries) && props.row.pingSeries.length"
                :data="props.row.pingSeries"
                type="bar"
                :width="sparklineWidth"
                :height="32"
                :options="sparklineOptions"
              />
              <div v-else class="text-grey-5">-</div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { Sparkline } from 'sparkline-vue'
import moment from 'moment'
import numbro from 'numbro'
import { SHARED_WORKER_EVENTS_KEY, SHARED_WORKER_KEY } from 'src/boot/shared-worker-client'

const columns = [
  {
    name: 'connectionId',
    label: 'Tab ID',
    field: 'connectionId',
    align: 'right',
    sortable: true,
    style: 'width: 100px; min-width: 100px;',
  },
  {
    name: 'role',
    label: 'Tab Role',
    field: 'isPrimary',
    align: 'left',
    style: 'width: 100px; min-width: 100px;',
  },
  {
    name: 'isTabHidden',
    label: 'Browser Tab Visibility',
    field: 'isTabHidden',
    align: 'left',
    sortable: true,
    style: 'width: 150px; min-width: 150px;',
  },
  {
    name: 'connectedAgo',
    label: 'Connected',
    field: 'connectedAt',
    align: 'right',
    style: 'width: 100px; min-width: 100px;',
  },
  {
    name: 'lastPing',
    label: 'Last Ping',
    field: 'lastPing',
    align: 'right',
    style: 'width: 100px; min-width: 100px;',
  },
  {
    name: 'pingSparkline',
    label: 'Ping Sparkline',
    field: 'pingSeries',
    align: 'left',
    style: 'width: auto;',
  },
]

export default defineComponent({
  name: 'IndexPage',
  components: {
    Sparkline,
  },
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
      sparklineWidth: 120,
    }
  },
  computed: {
    sparklineOptions() {
      return {
        barColor: '#00b4d8',
        tooltipFormat: 'tab ping: {{value}}',
      }
    },
  },
  methods: {
    formatAgo(value) {
      if (!value) {
        return '-'
      }
      const diffMs = this.nowTimestamp - value
      if (diffMs < 0) {
        return '0ms ago'
      }
      if (diffMs < 1000) {
        return `${diffMs}ms ago`
      }
      if (diffMs < 60_000) {
        return `${Math.round(diffMs / 1000)}s ago`
      }
      const minutes = Math.floor(diffMs / 60_000)
      const seconds = Math.round((diffMs % 60_000) / 1000)
      return `${minutes}m ${seconds}s ago`
    },
    formatLastPing(value) {
      if (!value) {
        return '-'
      }
      return numbro(value).format({ mantissa: 0, thousandSeparated: true })
    },
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
      this.updateSparklineWidth()
    },
    handleConnections(event) {
      this.updateRows(event.detail)
      this.updateSparklineWidth()
    },
    getRowClass(row) {
      return row.connectionId === this.currentConnectionId ? 'bg-blue-grey-9 text-white' : null
    },
    updateSparklineWidth() {
      const tableWidth =
        this.$refs.connectionsTable?.$el?.clientWidth ||
        (typeof window !== 'undefined' ? window.innerWidth : 400)
      const fixedColsWidth = 100 + 100 + 150 + 100 + 100
      const available = tableWidth - fixedColsWidth - 40 // account for padding/borders
      this.sparklineWidth = Math.max(120, available)
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
    this.updateSparklineWidth()
    this.workerEvents?.addEventListener('ready', this.handleReady)
    this.workerEvents?.addEventListener('connections', this.handleConnections)
    window.addEventListener('resize', this.updateSparklineWidth)
  },
  beforeUnmount() {
    if (this.nowInterval) {
      window.clearInterval(this.nowInterval)
    }
    this.workerEvents?.removeEventListener('ready', this.handleReady)
    this.workerEvents?.removeEventListener('connections', this.handleConnections)
    window.removeEventListener('resize', this.updateSparklineWidth)
  },
})
</script>
