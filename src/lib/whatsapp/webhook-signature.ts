import crypto from 'node:crypto'

/**
 * Verify the HMAC-SHA256 signature Meta attaches to webhook POSTs.
 *
 * Meta signs the raw request body with your App Secret and sends the
 * result in the `x-hub-signature-256: sha256=<hex>` header. Without
 * verification, anyone who knows our webhook URL can POST fabricated
 * status updates and drift broadcast counts arbitrarily.
 *
 * In multi-tenant / multi-app SaaS environments where different accounts
 * may be connected via different Meta Apps (e.g. legacy app vs platform app),
 * `META_APP_SECRET` can be configured as a comma-separated list of secrets:
 * `META_APP_SECRET=secret1,secret2`. The request is accepted if it matches
 * any valid secret in the list.
 *
 * Reference:
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verify-payloads
 *
 * Contract:
 *   `META_APP_SECRET` is **required**. If it's missing we fail closed —
 *   every request is rejected until the operator configures the
 *   secret.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secretEnv = process.env.META_APP_SECRET
  if (!secretEnv) {
    console.error(
      '[webhook] META_APP_SECRET is not set — rejecting request. ' +
        'Configure the env var (Meta → App Settings → Basic → App Secret) ' +
        'to enable signature verification.',
    )
    return false
  }

  if (!signatureHeader) return false
  if (!signatureHeader.startsWith('sha256=')) return false

  const secrets = secretEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (secrets.length === 0) return false

  const a = Buffer.from(signatureHeader)

  for (const secret of secrets) {
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    const b = Buffer.from(expected)
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true
    }
  }

  return false
}
