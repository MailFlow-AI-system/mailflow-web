import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from '../workspace-switching/fixture'
import { collectorCorrelates, collectSpanIds, privateTelemetryPaths } from './spans'
import type { CollectedSpan, WorkspaceTelemetryRecord } from './types'

test('ingests real Faro spans and correlates all workspace outcomes through Web/Core', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  const docker = process.env.MAILFLOW_WORKSPACE_DOCKER_COMMAND
  if (!docker) throw new Error('This acceptance requires the Docker CLI and local OTLP collector')
  const started = new Date().toISOString()
  await control('reset')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const envelopes = async (): Promise<unknown[]> =>
    (await fetch('http://127.0.0.1:14319/__snapshot')).json()
  await expect.poll(async () => JSON.stringify(await envelopes())).toContain('session_start')
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Assunto', exact: true })
    .fill('private-telemetry-subject')
  await page.getByRole('textbox', { name: 'Corpo da mensagem' }).fill('private-telemetry-body')
  await page.getByRole('button', { name: 'Minimizar janela' }).click()
  const records = async (): Promise<WorkspaceTelemetryRecord[]> =>
    (
      await fetch('http://127.0.0.1:8083/__telemetry', {
        headers: { 'x-fixture-control': data.controlKey },
      })
    ).json()

  const samples: WorkspaceTelemetryRecord[] = []
  const browserSpans: CollectedSpan[] = []
  const identities: string[] = []
  const exercise = async (path: string, target: string | null, status: number, result: string) => {
    const received = page.waitForResponse(
      (response) => new URL(response.url()).pathname === path && response.status() === status,
    )
    await page.evaluate(
      async ({ path, target }) => {
        const response = await fetch(path, {
          cache: 'no-store',
          ...(target
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: target }),
              }
            : {}),
        })
        await response.arrayBuffer()
      },
      { path, target },
    )
    const response = await received
    const identity = response.headers()['x-workspace-identity']
    if (identity) identities.push(identity)
    const traceparent = (await response.request().allHeaders()).traceparent
    expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/)
    const [, traceId, spanId] = traceparent.split('-')
    browserSpans.push({ traceId, spanId })
    const requestId = response.headers()['x-request-id']
    expect(requestId).toBeTruthy()
    await expect
      .poll(async () => (await records()).find((record) => record.requestId === requestId))
      .toMatchObject({ traceId, 'mailflow.workspace.result': result })
    const record = (await records()).find((record) => record.requestId === requestId)
    if (!record) throw new Error('Missing correlated Core completion')
    samples.push(record)
  }

  await exercise('/api/v1/workspaces', null, 200, 'success')
  await exercise('/api/v1/workspace-selection', data.unrelatedId, 404, 'denied')
  await control('fail-next')
  await exercise('/api/v1/workspace-selection', data.targetId, 502, 'failure')
  await control('fail-next-budget')
  await exercise('/api/v1/workspaces', null, 503, 'unavailable')
  await page.evaluate(async () => {
    for (let index = 0; index < 125; index++) {
      const response = await fetch('/api/v1/workspaces', { cache: 'no-store' })
      await response.arrayBuffer()
      if (response.status === 429) return
      if (response.status !== 200) throw new Error('Unexpected workspace budget outcome')
    }
    throw new Error('Finite budget exercise did not reach the limit')
  })
  await exercise('/api/v1/workspaces', null, 429, 'rate_limited')

  await expect
    .poll(
      async () => {
        const spans = collectSpanIds(await envelopes())
        return browserSpans.every((sample) =>
          spans.some((span) => span.traceId === sample.traceId && span.spanId === sample.spanId),
        )
      },
      { timeout: 15000 },
    )
    .toBe(true)
  expect(
    privateTelemetryPaths(await envelopes(), [
      data.email,
      data.otherEmail,
      data.password,
      data.host,
      data.targetHost,
      data.currentId,
      data.targetId,
      data.unrelatedId,
      data.controlKey,
      ...identities,
      'private-telemetry-subject',
      'private-telemetry-body',
    ]),
  ).toEqual([])

  await expect
    .poll(
      async () => {
        const { stdout, stderr } = await promisify(execFile)(
          docker,
          [
            '--context',
            'desktop-linux',
            'logs',
            '--since',
            started,
            'mailflow-workspace-otel-local',
          ],
          { maxBuffer: 20000000 },
        )
        const output = stdout + stderr
        return (
          collectorCorrelates(output, samples, browserSpans) &&
          output.includes('mailflow.workspace.operation.count') &&
          output.includes('mailflow.workspace.operation.duration')
        )
      },
      { timeout: 20000 },
    )
    .toBe(true)
  const after = await fixture()
  expect(after.preference).toBeNull()
  expect(after.globalMailCalls).toBe(0)
  expect(after.hasActiveOrganization).toBe(false)
  await page.getByRole('button', { name: 'Restaurar mensagem' }).click()
  await expect(page.getByRole('textbox', { name: 'Assunto', exact: true })).toHaveValue(
    'private-telemetry-subject',
  )
  await expect(page.getByRole('textbox', { name: 'Corpo da mensagem' })).toHaveText(
    'private-telemetry-body',
  )
  await testInfo.attach('local-correlation', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  })
})
