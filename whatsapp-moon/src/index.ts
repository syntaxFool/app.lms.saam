/**
 * Moon — WhatsApp-to-LMS bridge service.
 *
 * Connects to WhatsApp via Baileys and listens for incoming messages.
 * For each message, extracts the sender's phone number and either:
 *   - Creates a new lead (if phone is unknown)
 *   - Adds an activity to an existing lead (if phone is known)
 *
 * In both cases, creates a persistent notification visible in the LMS dashboard.
 */

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import Pino from 'pino'
import QRCode from 'qrcode-terminal'
import { handleIncomingMessage } from './handler'
import { config } from './config'

const logger = Pino({ level: config.logLevel })
let reconnectAttempts = 0

async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_moon')
  const { version, isLatest } = await fetchLatestBaileysVersion()

  logger.info(`🌕 Moon rising... Baileys v${version.join('.')}, latest=${isLatest}`)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: logger as any,
    printQRInTerminal: true,
    browser: ['Moon LMS Bot', 'Chrome', '1.0.0'],
  })

  // Persist credentials when they update (important for session persistence)
  sock.ev.on('creds.update', saveCreds)

  // Handle connection state changes with auto-reconnect
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    // Show QR code in terminal for WhatsApp pairing
    if (qr) {
      QRCode.generate(qr, { small: true })
      logger.info('📱 Scan the QR code above with WhatsApp to connect Moon')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      logger.warn(
        `Connection closed. Reason: ${(lastDisconnect?.error as Boom)?.message || 'unknown'}. ` +
        `Reconnecting: ${shouldReconnect}`
      )

      if (shouldReconnect) {
        // Exponential backoff: 2s, 4s, 8s, ... capped at 60s
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000)
        reconnectAttempts++
        setTimeout(connect, delay)
      } else {
        logger.error('🔴 Logged out from WhatsApp. Manual re-authentication required.')
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0
      logger.info('🌕 Moon connected to WhatsApp')
    }
  })

  // Handle incoming messages — the core functionality
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleIncomingMessage(msg as any, sock)
      } catch (err) {
        logger.error({ err }, 'Unhandled error in message handler')
      }
    }
  })
}

// Start Moon
connect().catch((err) => {
  logger.fatal({ err }, 'Failed to start Moon')
  process.exit(1)
})
