import { defineBoot } from '#q-app/wrappers'

const WORKER_NAME = 'browser tabs shared worker'

const createSharedWorker = () => {
  const workerUrl = new URL('../workers/browser-tabs-shared-worker.js', import.meta.url)

  const worker = new SharedWorker(workerUrl, {
    name: WORKER_NAME,
    type: 'module',
  })

  worker.port.start()

  worker.port.addEventListener('message', (event) => {
    if (event?.data?.type === 'worker-ready') {
      console.info(`${WORKER_NAME} ready`, event.data)
    }
  })

  worker.port.addEventListener('messageerror', (event) => {
    console.error(`${WORKER_NAME} message error`, event)
  })

  worker.port.postMessage({
    type: 'bootstrap',
    worker: WORKER_NAME,
  })

  return worker
}

export default defineBoot(({ app }) => {
  if (process.env.SERVER || typeof SharedWorker === 'undefined') {
    return
  }

  try {
    const worker = createSharedWorker()
    app.config.globalProperties.$sharedWorker = worker
    if (typeof window !== 'undefined') {
      window.__browserTabsSharedWorker = worker
    }
  } catch (error) {
    console.error(`Failed to start ${WORKER_NAME}`, error)
  }
})
