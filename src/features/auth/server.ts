import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'

import { clientEnvironment } from '#/config/env'
import { readAuthSession } from './session'

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store')
  return readAuthSession(clientEnvironment.VITE_API_BASE_URL, getRequestHeader('cookie'))
})
