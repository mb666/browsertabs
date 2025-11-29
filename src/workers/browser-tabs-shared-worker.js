/* eslint-env worker */

const WORKER_NAME = 'browser tabs shared worker'
const connections = new Map() // port -> { port, id, lastPingAt, isTabHidden }
let nextConnectionId = 1

self.onconnect = (event) => {
  const [port] = event.ports

  if (!port) {
    return
  }

  const connectionId = nextConnectionId++
  const connectionInfo = {
    port,
    id: connectionId,
    lastPingAt: null,
    isTabHidden: false,
  }

  connections.set(port, connectionInfo)
  port.start()

  port.postMessage({
    type: 'worker-ready',
    worker: WORKER_NAME,
    connectionId,
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
      return
    }

    if (data.type === 'ping') {
      const info = connections.get(port)
      if (info) {
        info.lastPingAt = Date.now()
      }

      port.postMessage({
        type: 'pong',
        worker: WORKER_NAME,
        timestamp: Date.now(),
        connections: Array.from(connections.values()).map(({ id, lastPingAt, isTabHidden }) => ({
          connectionId: id,
          lastPingAt,
          isTabHidden,
        })),
      })
    }

    if (data.type === 'disconnect') {
      connections.delete(port)
      port.close()
      return
    }
  })
}
