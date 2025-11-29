/* eslint-env worker */

const WORKER_NAME = 'browser tabs shared worker'
const connections = new Set()

self.onconnect = (event) => {
  const [port] = event.ports

  if (!port) {
    return
  }

  connections.add(port)
  port.start()

  port.postMessage({
    type: 'worker-ready',
    worker: WORKER_NAME,
    connections: connections.size,
  })

  port.addEventListener('message', (messageEvent) => {
    const { data } = messageEvent

    if (!data || typeof data !== 'object') {
      return
    }

    if (data.type === 'disconnect') {
      connections.delete(port)
      port.close()
      return
    }

    if (data.type === 'broadcast') {
      connections.forEach((targetPort) => {
        if (targetPort === port) {
          return
        }

        targetPort.postMessage({
          type: 'broadcast',
          worker: WORKER_NAME,
          payload: data.payload ?? null,
        })
      })

      return
    }

    if (data.type === 'ping') {
      port.postMessage({
        type: 'pong',
        worker: WORKER_NAME,
        timestamp: Date.now(),
      })
    }
  })
}
