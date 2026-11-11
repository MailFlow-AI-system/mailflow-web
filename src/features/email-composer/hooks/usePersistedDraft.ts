import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DraftConflictError,
  DraftRejectedError,
  type DraftSave,
  type DraftSnapshot,
  deleteDraft,
  saveDraft,
} from '../clients/drafts'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'
import { createCompositionId } from '../utils/compositionId'

type Options = {
  enabled: boolean
  active: boolean
  signature: string
  read: () => DraftSnapshot
  context: () => EmailDeliveryContext
  onChange?: () => void
}
export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export function snapshotSignature({ values, labels }: DraftSnapshot) {
  return JSON.stringify({
    ...values,
    attachments: values.attachments.map((file) => file.id),
    labels: labels.map((label) => label.id),
  })
}
function hasContent({ values, labels }: DraftSnapshot) {
  return Boolean(
    values.to.trim() ||
      values.cc.trim() ||
      values.bcc.trim() ||
      values.recipientName.trim() ||
      values.subject.trim() ||
      values.attachments.length ||
      labels.length ||
      new DOMParser().parseFromString(values.body, 'text/html').body.textContent?.trim() ||
      /<img[\s>]/i.test(values.body),
  )
}
export function usePersistedDraft(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const state = useRef({
    id: '',
    version: 0,
    signature: '',
    generation: 0,
    stopped: false,
    pending: null as DraftSave | null,
  })
  const running = useRef<Promise<boolean> | null>(null)
  const [status, setStatus] = useState<DraftSaveStatus>('idle')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const save = useCallback((): Promise<boolean> => {
    if (!latest.current.enabled) return Promise.resolve(true)
    if (running.current) return running.current
    if (state.current.stopped) return Promise.resolve(false)
    const generation = state.current.generation
    const execute = async () => {
      try {
        while (generation === state.current.generation && !state.current.stopped) {
          const snapshot = latest.current.read()
          const signature = snapshotSignature(snapshot)
          if (
            !state.current.pending &&
            (state.current.signature === signature || (!state.current.id && !hasContent(snapshot)))
          )
            return true
          state.current.id ||= createCompositionId()
          state.current.pending ??= {
            ...snapshot,
            id: state.current.id,
            version: state.current.version,
            mutationId: createCompositionId(),
          }
          const pending = state.current.pending
          setStatus('saving')
          setError('')
          setConflict(false)
          const result = await saveDraft(pending, latest.current.context())
          if (generation !== state.current.generation) return false
          state.current.version = result.version
          state.current.signature = snapshotSignature(pending)
          state.current.pending = null
          setStatus('saved')
          latest.current.onChange?.()
        }
        return false
      } catch (failure) {
        if (generation === state.current.generation) {
          if (failure instanceof DraftRejectedError) state.current.pending = null
          setStatus('error')
          setConflict(failure instanceof DraftConflictError)
          setError(
            failure instanceof EmailDeliveryError
              ? failure.message
              : 'The draft could not be saved. Your message was kept. Try again.',
          )
        }
        return false
      }
    }
    // Assign before execution can finish synchronously; every caller joins the same flush.
    const promise = execute()
    running.current = promise
    void promise.finally(() => {
      if (running.current === promise) running.current = null
    })
    return promise
  }, [])
  useEffect(() => {
    if (!options.enabled || !options.active) return
    const scheduledSignature = options.signature
    const timer = window.setTimeout(() => {
      if (latest.current.signature === scheduledSignature) void save()
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [options.enabled, options.active, options.signature, save])
  /** True while the editor holds changes that are not stored on the server yet. */
  const dirty = useCallback(() => {
    if (!latest.current.enabled || state.current.stopped) return false
    const snapshot = latest.current.read()
    return (
      Boolean(state.current.id || hasContent(snapshot)) &&
      snapshotSignature(snapshot) !== state.current.signature
    )
  }, [])
  const reset = useCallback(() => {
    state.current = {
      id: '',
      version: 0,
      signature: '',
      generation: state.current.generation + 1,
      stopped: false,
      pending: null,
    }
    setStatus('idle')
    setError('')
    setConflict(false)
  }, [])
  const saveCopy = useCallback(async () => {
    await running.current
    reset()
    return save()
  }, [reset, save])
  const adopt = useCallback((snapshot: DraftSnapshot & { id: string; version: number }) => {
    state.current = {
      ...state.current,
      id: snapshot.id,
      version: snapshot.version,
      signature: snapshotSignature(snapshot),
      pending: null,
      stopped: false,
    }
    setStatus('saved')
    setError('')
    setConflict(false)
  }, [])
  const discard = useCallback(async () => {
    state.current.stopped = true
    await running.current
    try {
      if (state.current.id)
        await deleteDraft(state.current.id, state.current.version, latest.current.context())
      latest.current.onChange?.()
      return true
    } catch (failure) {
      state.current.stopped = false
      setStatus('error')
      setConflict(failure instanceof DraftConflictError)
      setError(failure instanceof Error ? failure.message : 'The draft could not be deleted.')
      return false
    }
  }, [])
  return {
    enabled: options.enabled,
    status:
      status === 'saved' && snapshotSignature(options.read()) !== state.current.signature
        ? ('idle' as const)
        : status,
    error,
    conflict,
    save,
    dirty,
    saveCopy,
    reset,
    adopt,
    discard,
    reference: () =>
      state.current.version ? { id: state.current.id, version: state.current.version } : undefined,
  }
}
