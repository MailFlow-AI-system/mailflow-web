import { expect, test } from '@playwright/test'
import { matchesEntryUrl } from './entryUrl'

const messageId = '13fbbdc6-4f1f-4bee-b98e-a413b8e21f3d'
const tenant = 'http://acme.localhost:3003'

test('accepts exact entry destinations and an empty fragment', () => {
  for (const path of ['/inbox', '/sent', '/login', '/login?returnTo=%2Fsent']) {
    const expected = `${tenant}${path}`
    expect(matchesEntryUrl(new URL(expected), expected)).toBe(true)
    expect(matchesEntryUrl(new URL(`${expected}#`), expected)).toBe(true)
  }
})

test('allows one reader message on Inbox and Sent without changing the destination', () => {
  for (const path of ['/inbox', '/sent']) {
    const expected = `${tenant}${path}`
    expect(matchesEntryUrl(new URL(`${expected}?message=${messageId}`), expected)).toBe(true)
    expect(matchesEntryUrl(new URL(`${expected}?message=${messageId}#`), expected)).toBe(true)
    expect(
      matchesEntryUrl(
        new URL(`${expected}?q=invoice&message=${messageId}`),
        `${expected}?q=invoice`,
      ),
    ).toBe(true)
  }
})

test('requires an explicitly expected message to match exactly', () => {
  const expected = `${tenant}/sent?message=${messageId}`
  expect(matchesEntryUrl(new URL(expected), expected)).toBe(true)
  expect(matchesEntryUrl(new URL(`${tenant}/sent`), expected)).toBe(false)
  expect(matchesEntryUrl(new URL(`${tenant}/sent?message=another-message`), expected)).toBe(false)
  expect(matchesEntryUrl(new URL(`${expected}&redirect=https://evil.test`), expected)).toBe(false)
})

test('preserves exact query encoding and does not mutate the original URL', () => {
  for (const query of ['q=two%20words', 'q=two+words', 'q=~', 'q=%7E']) {
    const expected = `${tenant}/sent?${query}`
    const actual = new URL(`${expected}&message=${messageId}`)
    const original = actual.href
    expect(matchesEntryUrl(actual, expected)).toBe(true)
    expect(actual.href).toBe(original)
  }
  expect(
    matchesEntryUrl(
      new URL(`${tenant}/sent?q=two+words&message=${messageId}`),
      `${tenant}/sent?q=two%20words`,
    ),
  ).toBe(false)
  expect(
    matchesEntryUrl(new URL(`${tenant}/sent?q=%7E&message=${messageId}`), `${tenant}/sent?q=~`),
  ).toBe(false)
})

test('rejects unrelated or duplicate parameters, invalid messages and fragments', () => {
  for (const query of [
    '?message=',
    '?message=invalid',
    `?message=${messageId}&message=${messageId}`,
    `?q=private&message=${messageId}`,
    `?redirect=https://evil.test&message=${messageId}`,
    `?message=${messageId}#private`,
  ]) {
    expect(matchesEntryUrl(new URL(`${tenant}/sent${query}`), `${tenant}/sent`)).toBe(false)
  }
})

test('rejects another origin, workspace, port, protocol or collection', () => {
  const expected = `${tenant}/sent`
  for (const actual of [
    `http://evil.test/sent?message=${messageId}`,
    `http://northwind.localhost:3003/sent?message=${messageId}`,
    `http://acme.localhost:3004/sent?message=${messageId}`,
    `https://acme.localhost:3003/sent?message=${messageId}`,
    `${tenant}/inbox?message=${messageId}`,
  ]) {
    expect(matchesEntryUrl(new URL(actual), expected)).toBe(false)
  }
})

test('does not permit a reader message on login or other routes', () => {
  for (const path of ['/login', '/forgot-password', '/does-not-exist']) {
    const expected = `${tenant}${path}`
    expect(matchesEntryUrl(new URL(`${expected}?message=${messageId}`), expected)).toBe(false)
  }
  expect(
    matchesEntryUrl(
      new URL(`${tenant}/login?returnTo=%2Fsent&message=${messageId}`),
      `${tenant}/login?returnTo=%2Fsent`,
    ),
  ).toBe(false)
})
