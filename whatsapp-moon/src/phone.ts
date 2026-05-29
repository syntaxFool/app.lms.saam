/**
 * Phone normalization & WhatsApp contact resolution.
 *
 * WhatsApp delivers JIDs like "918452093228@s.whatsapp.net", but can also
 * include device suffixes (e.g. "918452093228:1@s.whatsapp.net") for
 * multi-device, or be a LID (Login ID) for privacy-enabled users.
 *
 * normalizeJidToLmsPhone — pure JID→phone conversion (handles device suffixes).
 * resolveContactPhone   — uses WhatsApp's contact lookup to verify & resolve.
 *
 * LMS stores phones like "+91 8452093228" (with space after country code).
 */

import type { WASocket } from '@whiskeysockets/baileys'
import { USyncQuery, USyncUser } from '@whiskeysockets/baileys'

// ─── Sync normalization (handles device suffixes) ──────────────────────────

export function normalizeJidToLmsPhone(jid: string): string {
  // Step 1: Get the raw identifier before @domain
  const beforeAt = jid.split('@')[0]
  if (!beforeAt) {
    throw new Error(`Cannot normalize empty JID: ${jid}`)
  }

  // Step 2: Strip device suffix (:1, :2, etc.) BEFORE stripping non-digits.
  //   This prevents the device number from merging into the phone digits.
  const phonePart = beforeAt.split(':')[0]
  if (!phonePart) {
    throw new Error(`Cannot normalize empty JID after removing device suffix: ${jid}`)
  }

  // Step 3: Now safely remove any remaining non-digit characters
  const digits = phonePart.replace(/\D/g, '')

  if (digits.length === 0) {
    throw new Error(`Cannot normalize empty JID: ${jid}`)
  }

  // ─── Known patterns ───

  // 10 digits — assume Indian number, prepend +91
  if (digits.length === 10) {
    return `+91 ${digits}`
  }

  // 12 digits starting with 91 — Indian with country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2)}`
  }

  // 11 digits starting with 1 — US/Canada
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1)}`
  }

  // 11 digits starting with 61 — Australia
  if (digits.length === 11 && digits.startsWith('61')) {
    return `+61 ${digits.slice(2)}`
  }

  // ─── General international (11-15 digits) ───
  if (digits.length >= 11 && digits.length <= 15) {
    for (const ccLen of [3, 2, 1]) {
      const cc = digits.slice(0, ccLen)
      const local = digits.slice(ccLen)
      if (local.length >= 7 && local.length <= 12) {
        return `+${cc} ${local}`
      }
    }
  }

  // ─── Fallback ───
  return `+${digits.slice(0, 2)} ${digits.slice(2)}`
}

// ─── Contact resolution result ─────────────────────────────────────────────

export interface ContactResolution {
  /** Phone number to use in LMS */
  phone: string
  /** Whether WhatsApp confirmed this phone via onWhatsApp lookup */
  verified: boolean
  /** Whether this is a LID user (phone is a JID-based fallback, not real number) */
  lid: boolean
}

/**
 * Extract the raw JID local part (before @ and : suffixes).
 * Used as a consistent fallback identifier for LID users.
 */
function jidLocalPart(jid: string): string {
  return jid.split('@')[0]?.split(':')[0] || ''
}

/**
 * Resolve a WhatsApp JID to a verified phone number using WhatsApp's
 * contact lookup APIs.
 *
 * Strategy (tried in order):
 *   1. Normalize JID → call onWhatsApp(phone) — confirms number exists
 *   2. If onWhatsApp returns a LID → the number exists! Return the normalized phone.
 *   3. If onWhatsApp fails (LID where we don't have the phone) →
 *      query USync by LID JID directly — the response may contain the
 *      phone-based JID (not just the LID), which we can normalize.
 *   4. Last resort: use the raw JID local part as a stable identifier.
 */
export async function resolveContactPhone(
  jid: string,
  sock: WASocket
): Promise<ContactResolution> {
  const candidate = normalizeJidToLmsPhone(jid)
  const rawId = jidLocalPart(jid)

  try {
    // ── Step 1: Try onWhatsApp with the normalized phone ──
    const results = await sock.onWhatsApp(candidate)

    if (results && results.length > 0) {
      const entry = results[0]

      if (entry.exists) {
        const confirmedBase = (entry.jid?.split('@')[0]?.split(':')[0] || '').replace(/\D/g, '')
        const originalBase = rawId.replace(/\D/g, '')

        if (entry.lid) {
          // onWhatsApp returned a LID — but the phone number EXISTS on WhatsApp.
          // The candidate phone IS a real WhatsApp number. Return it.
          // The `lid` flag means the user has privacy, but the phone itself is valid.
          console.log(`[Moon] 📞 Phone ${candidate} exists (LID user). Using number as-is.`)
          return { phone: candidate, verified: true, lid: true }
        }

        if (confirmedBase && confirmedBase === originalBase) {
          // Confirmed — phone number matches the sender's JID
          const verified = normalizeJidToLmsPhone(entry.jid)
          return { phone: verified, verified: true, lid: false }
        }

        // Mismatch — use the confirmed JID's phone
        if (entry.jid) {
          const fallback = normalizeJidToLmsPhone(entry.jid)
          return { phone: fallback, verified: true, lid: false }
        }
      }
    }

    // ── Step 2: onWhatsApp returned nothing — try USync query by JID ──
    // When querying by LID JID with contact+LID protocols, WhatsApp may
    // return the phone-based JID in the user node's `jid` attribute.
    console.log(`[Moon] 🔍 onWhatsApp returned nothing for ${candidate}. Trying USync by JID...`)
    const jidPhone = await resolvePhoneByJid(jid, sock)
    if (jidPhone) {
      return { phone: jidPhone, verified: true, lid: false }
    }

    // ── Step 3: All lookups failed — use raw JID identifier ──
    console.warn(`[Moon] ⚠️ Could not resolve phone for ${jid}. Using raw identifier: ${rawId}`)
    return { phone: rawId, verified: false, lid: true }

  } catch (err) {
    console.error(`[Moon] WhatsApp lookup failed for ${candidate}:`, err)
    return { phone: candidate, verified: false, lid: false }
  }
}

/**
 * Try to resolve a phone number by querying WhatsApp's USync endpoint
 * directly with the user's JID (which may be a LID).
 *
 * The USync response includes the user's JID (which might be the phone-based
 * JID even when querying by LID). We normalize that to get the phone.
 */
async function resolvePhoneByJid(
  jid: string,
  sock: WASocket
): Promise<string | null> {
  try {
    const query = new USyncQuery()
      .withContactProtocol()
      .withLIDProtocol()

    query.withUser(new USyncUser().withId(jid))

    const result = await (sock as any).executeUSyncQuery(query)
    if (!result?.list?.length) return null

    const entry = result.list[0]
    // entry.id is the JID from the response (might be phone-based JID)
    // entry.contact is true/false (whether contact exists)
    // entry.lid is the LID value

    if (entry && entry.id) {
      // Check if the returned JID gives us a valid phone
      const phoneFromJid = normalizeJidToLmsPhone(entry.id)
      // If the JID has digits that look like a real phone (12 digits starting with 91, etc.)
      const digits = entry.id.replace(/@.*$/, '').replace(/\D/g, '')
      if (digits.length >= 10 && digits.length <= 15) {
        console.log(`[Moon] 📞 USync JID lookup resolved: ${entry.id} → ${phoneFromJid}`)
        return phoneFromJid
      }
    }

    return null
  } catch (err) {
    console.error(`[Moon] USync JID lookup failed:`, err)
    return null
  }
}
