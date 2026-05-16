/**
 * Phone normalization: WhatsApp JID → LMS phone format.
 *
 * WhatsApp delivers JIDs like "918452093228@s.whatsapp.net".
 * LMS stores phones like "+91 8452093228" (with space after country code).
 *
 * This function bridges the two formats so the Moon service can
 * correctly look up and create leads via the LMS API.
 */

export function normalizeJidToLmsPhone(jid: string): string {
  // Strip @s.whatsapp.net and any non-digit characters
  const digits = jid.replace(/@.*$/, '').replace(/\D/g, '')

  if (digits.length === 0) {
    throw new Error(`Cannot normalize empty JID: ${jid}`)
  }

  // 10 digits — assume Indian number, prepend +91
  if (digits.length === 10) {
    return `+91 ${digits}`
  }

  // 12 digits starting with 91 — Indian with country code
  // e.g. "911234567890" → "+91 1234567890"
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`
  }

  // 11 digits starting with 1 — US/Canada
  // e.g. "14155551234" → "+1 4155551234"
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1)}`
  }

  // General international (11-15 digits)
  // Try common country code lengths: 3, 2, 1
  if (digits.length >= 11 && digits.length <= 15) {
    for (const ccLen of [3, 2, 1]) {
      const cc = digits.slice(0, ccLen)
      const local = digits.slice(ccLen)
      if (local.length >= 7 && local.length <= 12) {
        return `+${cc} ${local}`
      }
    }
  }

  // Fallback: +CC XXXXXX
  return `+${digits.slice(0, 2)} ${digits.slice(2)}`
}
