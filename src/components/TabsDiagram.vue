<template>
  <div class="q-border q-rounded-borders overflow-hidden" style="height: 400px;">
    <VueFlow
      ref="vueFlowRef"
      :nodes="nodes"
      :edges="edges"
      :fit-view-on-init="true"
      :nodes-draggable="false"
      :edges-updatable="false"
      :elements-selectable="false"
      :zoom-on-scroll="false"
      :node-types="nodeTypes"
      class="bg-grey-10"
    >
      <Background />
      <Controls :show-interactive="false" />
    </VueFlow>
  </div>
</template>

<script>
import { defineComponent, markRaw, nextTick, shallowRef, watch } from 'vue'
import { MarkerType, VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import dagre from 'dagre'
import TabNode from './TabNode.vue'
import SharedWorkerNode from './SharedWorkerNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

export default defineComponent({
  name: 'TabsDiagram',
  components: {
    VueFlow,
    Background,
    Controls,
  },
  props: {
    rows: {
      type: Array,
      default: () => [],
    },
    nowTimestamp: {
      type: Number,
      default: () => Date.now(),
    },
  },
  setup(props) {
    const nodeTypes = {
      tabNode: markRaw(TabNode),
      sharedNode: markRaw(SharedWorkerNode),
    }

    const nodes = shallowRef([])
    const edges = shallowRef([])
    const vueFlowRef = shallowRef(null)

    const layoutElements = (nodesInput, edgesInput) => {
      const g = new dagre.graphlib.Graph()
      g.setDefaultEdgeLabel(() => ({}))
      g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, marginx: 20, marginy: 20 })

      nodesInput.forEach((node) => {
        const width = node.width || 240
        const height = node.height || 120
        g.setNode(node.id, { width, height })
      })
      edgesInput.forEach((edge) => g.setEdge(edge.source, edge.target))

      dagre.layout(g)

      const layoutedNodes = nodesInput.map((node) => {
        const nodeWithPosition = g.node(node.id)
        const width = node.width || 240
        const height = node.height || 120
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
          },
        }
      })

      const nodeIds = new Set(layoutedNodes.map((n) => n.id))
      const layoutedEdges = edgesInput.filter((edge) => {
        const hasSource = nodeIds.has(edge.source)
        const hasTarget = nodeIds.has(edge.target)
        const ok = hasSource && hasTarget
        if (!ok) {
          console.error('[TabsDiagram] Edge missing endpoint', {
            edge,
            hasSource,
            hasTarget,
            nodeIds: Array.from(nodeIds),
          })
        }
        return ok
      })

      return { nodes: layoutedNodes, edges: layoutedEdges }
    }

    const fitToView = () => {
      const instance = vueFlowRef.value?.getVueFlow?.()
      if (instance?.fitView) {
        instance.fitView({ padding: 0.2, includeHiddenNodes: true })
      }
    }

    const rebuildGraph = () => {
      console.info('[TabsDiagram] rebuild start', {
        rowsLength: props.rows.length,
        nowTimestamp: props.nowTimestamp,
      })
      const sharedId = 'shared-worker'
      const baseNodes = [
        {
          id: sharedId,
          type: 'sharedNode',
          data: { tabCount: props.rows.length },
          position: { x: 0, y: 0 },
          width: 200,
          height: 80,
          sourcePosition: 'bottom',
        },
      ]

      const baseEdges = []

      const skippedRows = []

      props.rows.forEach((row) => {
        if (row?.connectionId == null) {
          skippedRows.push(row)
          return
        }
        const nodeId = `tab-${row.connectionId}`
        baseNodes.push({
          id: nodeId,
          type: 'tabNode',
          data: {
            connectionId: row.connectionId,
            connectedAt: row.connectedAt,
            lastPing: row.lastPing,
            isTabHidden: row.isTabHidden,
            isPrimary: row.isPrimary,
            nowTimestamp: props.nowTimestamp,
          },
          position: { x: 0, y: 0 },
          width: 260,
          height: 130,
          targetPosition: 'top',
          sourcePosition: 'bottom',
        })
        baseEdges.push({
          id: `edge-${sharedId}-${nodeId}`,
          source: sharedId,
          target: nodeId,
          type: 'bezier',
          pathOptions: { curvature: 0.35 },
          markerEnd: MarkerType.ArrowClosed,
          sourceHandle: 'bottom',
          targetHandle: 'top',
        })
      })

      if (skippedRows.length) {
        console.warn('[TabsDiagram] Skipping rows without connectionId', { skippedRows })
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(baseNodes, baseEdges)
      console.info('[TabsDiagram] Rebuilt graph', {
        nodeCount: layoutedNodes.length,
        edgeCount: layoutedEdges.length,
        nodeIds: layoutedNodes.map((n) => n.id),
        edgeIds: layoutedEdges.map((e) => e.id),
      })
      edges.value = []
      nodes.value = []
      nextTick(() => {
        nodes.value = layoutedNodes
        nextTick(() => {
          edges.value = layoutedEdges
          console.info('[TabsDiagram] Applied graph', {
            nodeCount: nodes.value.length,
            edgeCount: edges.value.length,
          })
          nextTick(() => {
            fitToView()
          })
        })
      })
    }

    watch(
      () => [props.rows, props.nowTimestamp],
      () => {
        rebuildGraph()
      },
      { deep: true, immediate: true },
    )

    return {
      nodeTypes,
      nodes,
      edges,
      vueFlowRef,
    }
  },
})
</script>
