<template>
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
          <q-badge color="primary" text-color="white" v-if="props.row.isPrimary">Primary</q-badge>
          <q-badge color="blue-grey-7" text-color="white" v-else>Secondary</q-badge>
        </q-td>
        <q-td key="isTabHidden" :props="props">
          <q-badge color="negative" text-color="white" v-if="props.row.isTabHidden">Hidden</q-badge>
          <q-badge color="positive" text-color="white" v-else>Visible</q-badge>
        </q-td>
        <q-td key="connectedAgo" :props="props">
          {{ formatAgo(props.row.connectedAt) }}
        </q-td>
        <q-td key="lastPing" :props="props">
          {{ formatLastPing(props.row.lastPing) }}ms
        </q-td>
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
</template>

<script>
import { defineComponent } from 'vue'
import { Sparkline } from 'sparkline-vue'
import numbro from 'numbro'

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
  name: 'TabsTable',
  components: {
    Sparkline,
  },
  props: {
    rows: {
      type: Array,
      default: () => [],
    },
    currentConnectionId: {
      type: [String, Number],
      default: null,
    },
    nowTimestamp: {
      type: Number,
      default: () => Date.now(),
    },
  },
  data() {
    return {
      columns,
      sparklineWidth: 120,
    }
  },
  computed: {
    sparklineOptions() {
      return {
        barColor: '#00b4d8',
        tooltipFormat: 'tab ping: {{value}}ms',
      }
    },
  },
  watch: {
    rows() {
      this.$nextTick(this.updateSparklineWidth)
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
    getRowClass(row) {
      return row.connectionId === this.currentConnectionId ? 'bg-blue-grey-9 text-white' : null
    },
    updateSparklineWidth() {
      const tableWidth =
        this.$refs.connectionsTable?.$el?.clientWidth ||
        (typeof window !== 'undefined' ? window.innerWidth : 400)
      const fixedColsWidth = 100 + 100 + 150 + 100 + 100
      const available = tableWidth - fixedColsWidth - 40
      this.sparklineWidth = Math.max(120, available)
    },
  },
  mounted() {
    this.$nextTick(this.updateSparklineWidth)
    window.addEventListener('resize', this.updateSparklineWidth)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateSparklineWidth)
  },
})
</script>
