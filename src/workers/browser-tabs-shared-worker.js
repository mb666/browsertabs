/* eslint-env worker */

const WORKER_NAME = 'browser tabs shared worker'
const connections = new Map() // port -> { port, id, connectedAt, pings, isTabHidden, isPrimary }
let nextConnectionId = 1
let primaryConnectionId = null

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

  if (primaryConnectionId) {
    const primaryInfo = all.find((info) => info.id === primaryConnectionId)
    if (primaryInfo && primaryInfo.isTabHidden && firstActive) {
      primaryConnectionId = firstActive.id
    }
  } else if (firstActive) {
    primaryConnectionId = firstActive.id
  } else if (all.length > 0) {
    primaryConnectionId = all[0].id
  }

  connections.forEach((info) => {
    info.isPrimary = info.id === primaryConnectionId
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

    if (!data || typeof data !== 'object') {
      return
    }

    if (data.type === 'broadcast') {
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

      return
    }

    if (data.type === 'visibility-change') {
      const info = connections.get(port)
      if (info && typeof data.isTabHidden === 'boolean') {
        info.isTabHidden = data.isTabHidden
      }
      selectPrimary(info && !info.isTabHidden ? info.id : null)
      return
    }

    if (data.type === 'ping') {
      const info = connections.get(port)
      if (info) {
        info.pings.push(Date.now())
        if (info.pings.length > 100) {
          info.pings.shift()
        }
      }
      selectPrimary()

      port.postMessage({
        type: 'pong',
        worker: WORKER_NAME,
        timestamp: Date.now(),
        connections: Array.from(connections.values()).map(({
          id, connectedAt, pings, isTabHidden, isPrimary,
        }) => ({
          connectionId: id,
          connectedAt,
          pings,
          isTabHidden,
          isPrimary,
        })),
      })
    }

    if (data.type === 'disconnect') {
      connections.delete(port)
      selectPrimary()
      port.close()
      return
    }
  })
}
