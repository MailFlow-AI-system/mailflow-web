import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

import { LogoutButton } from '#/features/auth/LogoutButton'

export const Route = createFileRoute('/_authenticated/_mail')({ component: MailLayout })

function MailLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
      <nav aria-label="Mail folders">
        <ul className="space-y-1">
          <li>
            <Link to="/inbox" {...folderLinkProps}>
              Inbox
            </Link>
          </li>
          <li>
            <Link to="/sent" {...folderLinkProps}>
              Sent
            </Link>
          </li>
          <li>
            <Link to="/drafts" {...folderLinkProps}>
              Drafts
            </Link>
          </li>
          <li>
            <Link to="/starred" {...folderLinkProps}>
              Starred
            </Link>
          </li>
          <li>
            <Link to="/spam" {...folderLinkProps}>
              Spam
            </Link>
          </li>
          <li>
            <Link to="/trash" {...folderLinkProps}>
              Trash
            </Link>
          </li>
        </ul>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

const folderLinkProps = {
  activeOptions: { exact: true },
  activeProps: { 'aria-current': 'page' as const },
  className:
    'block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-semibold aria-[current=page]:text-foreground',
}
