import { createFileRoute } from '@tanstack/react-router'

import { redirectRootEntry } from '#/features/auth/routeGuards'

export const Route = createFileRoute('/_public/')({ beforeLoad: redirectRootEntry })
