/**
 * Core message handler for Moon.
 *
 * Called for EVERY incoming WhatsApp message (except groups, broadcasts, own messages).
 * Flow:
 *   1. Extract JID from message
 *   2. Resolve phone via WhatsApp contact lookup (handles LIDs + device suffixes)
 *   3. Check if lead exists in LMS
 *   4. If yes → add activity + notification
 *   5. If no  → create lead + notification
 */

import type { WASocket } from '@whiskeysockets/baileys'
import { resolveContactPhone } from './phone'
import { lmsApi } from './api'

interface WAMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
    documentMessage?: { caption?: string }
  }
}

/**
 * Handle an incoming WhatsApp message.
 *
 * @param msg   The raw WhatsApp message
 * @param sock  The Baileys WASocket for contact lookups
 */
export async function handleIncomingMessage(msg: WAMessage, sock: WASocket): Promise<void> {
  // ── Filter: skip outgoing, group chats, broadcasts, status updates ──
  if (msg.key.fromMe) return

  const jid = msg.key.remoteJid
  if (!jid) return
  if (jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@status')) return

  // ── Extract message text ──
  const text = extractMessageText(msg)
  const summary = text ? text.slice(0, 80) : '(media)'

  // ── Resolve phone via WhatsApp contact lookup ──
  let phone: string
  try {
    const resolution = await resolveContactPhone(jid, sock)
    phone = resolution.phone
  } catch (err) {
    console.error(`[Moon] Failed to resolve phone for JID: ${jid}`, err)
    return
  }

  console.log(`[Moon] 🌕 Message from ${phone}: "${summary}"`)

  try {
    // ── Check if lead already exists ──
    const check = await lmsApi.checkDuplicate(phone)

    if (check.exists && check.leads.length > 0) {
      // ── EXISTING LEAD: add activity + notification ──
      const lead = check.leads[0]
      const note = text
        ? `WhatsApp message: ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`
        : 'WhatsApp media received (no caption)'

      await lmsApi.addActivity(lead.id, {
        type: 'message',
        note,
      })

      await lmsApi.createNotification({
        title: '💬 WhatsApp message',
        message: `${lead.name || phone}: ${text ? text.slice(0, 100) : 'Sent media'}`,
        type: 'whatsapp-message',
        leadId: lead.id,
        createdBy: 'moon',
      })

      console.log(`[Moon] ✅ Activity added to lead ${lead.id}`)
    } else {
      // ── NEW LEAD: create lead + notification ──
      const newLead = await lmsApi.createLead({
        phone,
        status: 'New',
        source: 'WhatsApp',
        notes: text
          ? `Auto-created from WhatsApp: "${text.slice(0, 500)}"`
          : 'Auto-created from WhatsApp (media message)',
      })

      const leadId = newLead?.id
      if (leadId) {
        await lmsApi.createNotification({
          title: '🆕 New lead from WhatsApp',
          message: `${phone} — ${text ? text.slice(0, 100) : 'Sent media'}`,
          type: 'whatsapp-new-lead',
          leadId,
          createdBy: 'moon',
        })
        console.log(`[Moon] ✅ New lead created: ${leadId}`)
      }
    }
  } catch (err: any) {
    console.error(`[Moon] ❌ Error processing message from ${phone}:`,
      err.response?.status, err.response?.data || err.message)

    try {
      await lmsApi.createNotification({
        title: '⚠️ Moon processing error',
        message: `Failed to process message from ${phone}: ${err.message}`,
        type: 'error',
        createdBy: 'moon',
      })
    } catch {
      console.error('[Moon] Could not create error notification')
    }
  }
}

/**
 * Extract readable text from various WhatsApp message content types.
 */
function extractMessageText(msg: WAMessage): string | null {
  if (!msg.message) return null
  const m = msg.message
  if (m.conversation) return m.conversation
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text
  if (m.imageMessage?.caption) return m.imageMessage.caption
  if (m.videoMessage?.caption) return m.videoMessage.caption
  if (m.documentMessage?.caption) return m.documentMessage.caption
  return null
}
