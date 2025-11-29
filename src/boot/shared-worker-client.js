import { defineBoot } from '#q-app/wrappers'

const WORKER_NAME = 'browser tabs shared worker'
export const SHARED_WORKER_KEY = Symbol('shared-worker')
export const SHARED_WORKER_EVENTS_KEY = Symbol('shared-worker-events')

const createSharedWorker = () => {
  const workerUrl = new URL('../workers/browser-tabs-shared-worker.js', import.meta.url)

  const worker = new SharedWorker(workerUrl, {
    name: WORKER_NAME,
    type: 'module',
  })

  worker.port.start()

  let pingTimeoutId
  const workerEvents = new EventTarget()

  const sendPing = () => {
    worker.port.postMessage({
      type: 'ping',
      worker: WORKER_NAME,
      timestamp: Date.now(),
    })
  }

  const schedulePing = () => {
    if (typeof window === 'undefined') {
      return
    }
    pingTimeoutId = window.setTimeout(() => {
      sendPing()
      schedulePing()
    }, 1000)
  }

  const reportVisibility = () => {
    if (typeof document === 'undefined') {
      return
    }
    worker.port.postMessage({
      type: 'visibility-change',
      worker: WORKER_NAME,
      isTabHidden: document.hidden,
    })
  }

  worker.port.addEventListener('message', (event) => {
    if (event?.data?.type === 'worker-ready') {
      console.info(`${WORKER_NAME} ready`, event.data)
      sendPing()
      if (typeof window !== 'undefined') {
        schedulePing()
        reportVisibility()
        const onBeforeUnload = () => {
          if (pingTimeoutId) {
            window.clearTimeout(pingTimeoutId)
          }
          worker.port.postMessage({
            type: 'disconnect',
            worker: WORKER_NAME,
          })
        }
        window.addEventListener('visibilitychange', reportVisibility)
        window.addEventListener(
          'beforeunload',
          onBeforeUnload,
          { once: true },
        )
      }
      return
    }

    if (event?.data?.type === 'pong') {
      worker.connections = event.data.connections ?? []
      console.info(`${WORKER_NAME} connections`, worker.connections)
      workerEvents.dispatchEvent(new CustomEvent('connections', { detail: worker.connections }))
    }
  })

  worker.port.addEventListener('messageerror', (event) => {
    console.error(`${WORKER_NAME} message error`, event)
  })

  worker.port.postMessage({
    type: 'bootstrap',
    worker: WORKER_NAME,
  })

  worker.events = workerEvents
  return worker
}

export default defineBoot(({ app }) => {
  if (process.env.SERVER || typeof SharedWorker === 'undefined') {
    return
  }

  try {
    const worker = createSharedWorker()
    app.config.globalProperties.$sharedWorker = worker
    app.provide(SHARED_WORKER_KEY, worker)
    app.provide(SHARED_WORKER_EVENTS_KEY, worker.events)
  } catch (error) {
    console.error(`Failed to start ${WORKER_NAME}`, error)
  }
})
