import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'
import { installBrowserCoordination } from './browserCoordination'
import { authRuntime } from '../features/auth/runtime'
import { clearPrivateData } from '../features/auth/privacy'

beforeAll(() => {
  installBrowserCoordination()
  server.listen({
    onUnhandledRequest: 'error',
  })
})

afterEach(() => {
  cleanup()
  clearPrivateData()
  sessionStorage.clear()
  localStorage.clear()
  authRuntime.dispose()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
