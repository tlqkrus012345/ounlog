import { setupServer } from 'msw/node'
import { guestAuthHandlers } from './authFixture'

export const server = setupServer(...guestAuthHandlers)
