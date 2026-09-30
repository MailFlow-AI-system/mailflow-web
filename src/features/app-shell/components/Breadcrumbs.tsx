import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@mailflow/ui/components'
import { Link, useRouterState } from '@tanstack/react-router'
import { Fragment } from 'react'

import { breadcrumbsByPath } from '../navigation'
import type { AppShellBreadcrumbsProps } from '../types'

export function Breadcrumbs({ items }: AppShellBreadcrumbsProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const breadcrumbs = items ?? breadcrumbsByPath[pathname] ?? [{ label: 'App' }]

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="m-0 min-w-0 list-none p-0">
        {breadcrumbs.map((item, index) => {
          const current = index === breadcrumbs.length - 1
          return (
            <Fragment key={item.to ?? item.label}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {current || !item.to ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={item.to} />}>{item.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
