/* eslint-env worker */

const WORKER_NAME = 'browser tabs shared worker'
const MAX_PINGS = 100
const connections = new Map() // port -> { port, id, connectedAt, pings, isTabHidden, isPrimary }
let nextConnectionId = 1
let primaryConnectionId = null

const setPrimary = (connectionId) => {
  primaryConnectionId = connectionId
  connections.forEach((info) => {
    info.isPrimary = info.id === primaryConnectionId
  })
}

const selectPrimary = (preferredActiveId = null) => {
  const all = Array.from(connections.values())

  // Remove stale primary if not present
  const primaryStillExists = all.some((info) => info.id === primaryConnectionId)
  if (!primaryStillExists) {
    primaryConnectionId = null
  }

  const preferredActive = preferredActiveId
    ? all.find((info) => info.id === preferredActiveId && !info.isTabHidden)
    : null
  const firstActive = preferredActive ?? all.find((info) => !info.isTabHidden)

  if (primaryConnectionId && firstActive) {
    const primaryInfo = all.find((info) => info.id === primaryConnectionId)
    if (primaryInfo?.isTabHidden) {
      setPrimary(firstActive.id)
      return
    }
  }

  if (!primaryConnectionId) {
    if (firstActive) {
      setPrimary(firstActive.id)
    } else if (all.length > 0) {
      setPrimary(all[0].id)
    }
  } else {
    setPrimary(primaryConnectionId)
  }
}

const toConnectionPayload = (info) => ({
  connectionId: info.id,
  connectedAt: info.connectedAt,
  pings: info.pings,
  isTabHidden: info.isTabHidden,
  isPrimary: info.isPrimary,
})

const broadcastConnections = (port, worker) => {
  port.postMessage({
    type: 'pong',
    worker,
    timestamp: Date.now(),
    connections: Array.from(connections.values()).map(toConnectionPayload),
  })
}

self.onconnect = (event) => {
  const [port] = event.ports

  if (!port) {
    return
  }

  const connectionId = nextConnectionId++
  const connectionInfo = {
    port,
    id: connectionId,
    connectedAt: Date.now(),
    pings: [],
    isTabHidden: false,
    isPrimary: false,
  }

  connections.set(port, connectionInfo)
  selectPrimary(connectionId)
  port.start()

  port.postMessage({
    type: 'worker-ready',
    worker: WORKER_NAME,
    connectionId,
    connectedAt: connectionInfo.connectedAt,
    connections: connections.size,
  })

  port.addEventListener('message', (messageEvent) => {
    const { data } = messageEvent
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
      return
    }

    switch (data.type) {
      case 'broadcast': {
        connections.forEach((info) => {
          if (info.port === port) {
            return
          }

          info.port.postMessage({
            type: 'broadcast',
            worker: WORKER_NAME,
            payload: data.payload ?? null,
          })
        })
        break
      }

      case 'visibility-change': {
        const info = connections.get(port)
        if (info && typeof data.isTabHidden === 'boolean') {
          info.isTabHidden = data.isTabHidden
        }
        selectPrimary(info && !info.isTabHidden ? info.id : null)
        break
      }

      case 'ping': {
        const info = connections.get(port)
        if (info) {
          info.pings.push(Date.now())
          if (info.pings.length > MAX_PINGS) {
            info.pings.shift()
          }
        }
        selectPrimary()
        broadcastConnections(port, WORKER_NAME)
        break
      }

      case 'disconnect': {
        connections.delete(port)
        selectPrimary()
        port.close()
        break
      }

      default:
        break
    }
  })
}
