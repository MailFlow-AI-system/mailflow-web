import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MailMessageCard } from './MailMessageCard'

describe('MailMessageCard', () => {
  afterEach(cleanup)

  it('renders sender initials, subject, and the plain-text body preview without reader controls or metadata', () => {
    render(
      <ul>
        <MailMessageCard
          message={{
            id: 'message-1',
            senderName: 'Ada Lovelace',
            subject: 'Analytical Engine',
            body: '<img src=x onerror=alert(1)> A long plain-text body',
            receivedAt: '2026-10-01T12:00:00.000Z',
          }}
        />
      </ul>,
    )

    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Analytical Engine')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)> A long plain-text body')).toHaveClass(
      'truncate',
    )
    expect(document.querySelector('img')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/2026|favorite|star/i)).not.toBeInTheDocument()
  })
})
