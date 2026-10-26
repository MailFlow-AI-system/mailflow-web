import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEmailSending } from './useEmailSending'

const { sendEmail, success, error, loading } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(() => 'toast-id'),
}))
vi.mock('../clients/sendEmail', () => ({ sendEmail }))
vi.mock('@mailflow/ui/components', async (original) => ({
  ...(await original<object>()),
  toast: { success, error, loading },
}))
const composition = {
  to: ['ada@example.test'],
  cc: [],
  bcc: [],
  subject: 'Hello',
  body: '<p>Hello</p>',
  attachments: [],
}
afterEach(() => vi.clearAllMocks())
describe('useEmailSending', () => {
  it('shows immediate progress then success, and invalidates sent messages', async () => {
    let resolve!: () => void
    sendEmail.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const onSent = vi.fn()
    const { result } = renderHook(() => useEmailSending(onSent))
    let attempt!: Promise<void>
    act(() => {
      attempt = result.current(composition)
    })
    expect(loading).toHaveBeenCalled()
    await act(async () => {
      resolve()
      await attempt
    })
    expect(success).toHaveBeenCalledWith('E-mail enviado com sucesso.', { id: 'toast-id' })
    expect(onSent).toHaveBeenCalledTimes(1)
  })
  it('keeps the same request id after failure, and changes it after success', async () => {
    sendEmail.mockRejectedValueOnce(new Error('private')).mockResolvedValue(undefined)
    const { result } = renderHook(() => useEmailSending())
    await expect(result.current(composition)).rejects.toThrow()
    await result.current(composition)
    const firstId = sendEmail.mock.calls[0]?.[1]
    expect(sendEmail.mock.calls[1]?.[1]).toBe(firstId)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('mantida'), { id: 'toast-id' })
    await result.current(composition)
    expect(sendEmail.mock.calls[2]?.[1]).not.toBe(firstId)
  })
  it('changes the request id when the failed composition is edited', async () => {
    sendEmail.mockRejectedValueOnce(new Error()).mockResolvedValue(undefined)
    const { result } = renderHook(() => useEmailSending())
    await expect(result.current(composition)).rejects.toThrow()
    await result.current({ ...composition, subject: 'Edited' })
    expect(sendEmail.mock.calls[0]?.[1]).not.toBe(sendEmail.mock.calls[1]?.[1])
  })
})
