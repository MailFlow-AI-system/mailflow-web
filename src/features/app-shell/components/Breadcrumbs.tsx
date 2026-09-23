import { ChevronRight } from '@mailflow/ui/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import { breadcrumbsByPath } from '../navigation'
import type { AppShellBreadcrumbsProps } from '../types'

export function Breadcrumbs({ items }: AppShellBreadcrumbsProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const breadcrumbs = items ?? breadcrumbsByPath[pathname] ?? [{ label: 'App' }]

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0">
        {breadcrumbs.map((item, index) => {
          const current = index === breadcrumbs.length - 1
          return (
            <li
              className="flex items-center gap-2 text-sm text-muted-foreground last:font-medium last:text-foreground"
              key={item.to ?? item.label}
            >
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5" /> : null}
              {current || !item.to ? (
                <span aria-current={current ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link className="no-underline hover:text-foreground" to={item.to}>
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
