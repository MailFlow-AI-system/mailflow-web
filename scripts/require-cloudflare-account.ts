import { isCloudflareAccountId } from '../src/config/cloudflare-account.ts'

if (!isCloudflareAccountId(process.env.CLOUDFLARE_ACCOUNT_ID)) {
  console.error(
    'CLOUDFLARE_ACCOUNT_ID must be set to a 32-character hexadecimal Cloudflare account ID before deploying.',
  )
  process.exit(1)
}
