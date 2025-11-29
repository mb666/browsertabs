<template>
  <q-page class="q-pa-md">
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6">Shared Worker Connections</div>
        <div class="text-caption text-grey-7">
          Live state of tabs connected to the browser shared worker.
        </div>
      </q-card-section>
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="connectionId"
        flat
        dense
        wrap-cells
        :loading="!rows.length"
      >
        <template #body-cell-lastPingAt="props">
          <q-td :props="props">
            {{ formatLastPing(props.value) }}
          </q-td>
        </template>
        <template #body-cell-isTabHidden="props">
          <q-td :props="props">
            <q-badge color="grey-7" v-if="props.value">Hidden</q-badge>
            <q-badge color="positive" v-else>Visible</q-badge>
          </q-td>
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
    }
  },
  methods: {
    formatLastPing(value) {
      if (!value) {
        return '—'
      }
      return moment(value).format('HH:mm:ss.SSS')
    },
    updateRows(connections) {
      this.rows = (connections ?? []).map((connection) => ({
        connectionId: connection.connectionId,
        lastPingAt: connection.lastPingAt,
        isTabHidden: connection.isTabHidden,
      }))
    },
    handleConnections(event) {
      this.updateRows(event.detail)
    },
  },
  mounted() {
    if (this.worker?.connections) {
      this.updateRows(this.worker.connections)
    }
    this.workerEvents?.addEventListener('connections', this.handleConnections)
  },
  beforeUnmount() {
    this.workerEvents?.removeEventListener('connections', this.handleConnections)
  },
})
</script>
