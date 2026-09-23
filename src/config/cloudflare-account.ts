const CLOUDFLARE_ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/i

export const isCloudflareAccountId = (value: string | undefined) =>
  CLOUDFLARE_ACCOUNT_ID_PATTERN.test(value?.trim() ?? '')
