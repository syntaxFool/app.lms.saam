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
import * as fs from 'fs'
import * as path from 'path'
import { handleIncomingMessage } from './handler'
import { config } from './config'

const logger = Pino({ level: config.logLevel })
const AUTH_DIR = config.authDir
let reconnectAttempts = 0

function logQrAsText(qr: string): void {
  // Also log as a base64 data URL so it's visible as clickable link in logs
  const base64 = Buffer.from(qr).toString('base64')
  logger.info(`📱 QR as base64 data URL (open in browser to scan):`)
  logger.info(`data:image/png;base64,${base64}`)

  // Render ASCII QR to terminal
  QRCode.generate(qr, { small: true })
  logger.info(`📱 Or scan the QR code above with WhatsApp to connect ${config.serviceName}`)
}

function clearStaleAuth(): void {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      // Delete all files inside (works on bind mounts — can't rmdir the mount point)
      const files = fs.readdirSync(AUTH_DIR)
      for (const file of files) {
        fs.unlinkSync(path.join(AUTH_DIR, file))
      }
      logger.info('🧹 Cleared stale WhatsApp auth session. Next startup will show fresh QR.')
    }
  } catch (err) {
    logger.warn({ err }, 'Could not clear stale auth files (may already be clean)')
  }
}

async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version, isLatest } = await fetchLatestBaileysVersion()

  logger.info(`🌕 ${config.serviceName} rising... Baileys v${version.join('.')}, latest=${isLatest}`)

  // Set up proxy if configured (for networks that block WhatsApp)
  let agent: any = undefined
  if (config.proxyUrl) {
    if (config.proxyUrl.startsWith('socks')) {
      const { SocksProxyAgent } = require('socks-proxy-agent')
      agent = new SocksProxyAgent(config.proxyUrl)
    } else {
      const { HttpsProxyAgent } = require('https-proxy-agent')
      agent = new HttpsProxyAgent(config.proxyUrl)
    }
    logger.info(`🔌 Using proxy: ${config.proxyUrl}`)
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger: logger as any,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    agent,
    syncFullHistory: false,
    fireInitQueries: false,
  })

  // Persist credentials when they update (important for session persistence)
  sock.ev.on('creds.update', saveCreds)

  // Track whether we've already attempted pairing to avoid duplicates on reconnect
  let pairingAttempted = false

  // Handle connection state changes with auto-reconnect
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    // ── Request pairing code when socket is in connecting state ──
    // Must happen after connection.update fires (not via setTimeout race)
    if (config.moonPhone && connection === 'connecting' && !pairingAttempted) {
      pairingAttempted = true
      setTimeout(async () => {
        try {
          const code = await (sock as any).requestPairingCode(config.moonPhone)
          logger.info(`📱 Pairing code: ${code}`)
          logger.info(`📱 Open WhatsApp → Linked Devices → Link a Device → enter: ${code}`)
        } catch (err: any) {
          logger.warn({ err }, 'Pairing code request failed, falling back to QR')
        }
      }, 1000)
    }

    // Show QR code in terminal for WhatsApp pairing
    if (qr) {
      logQrAsText(qr)
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const reason = (lastDisconnect?.error as Boom)?.message || 'unknown'
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      logger.warn(
        `Connection closed. Reason: ${reason} (code ${statusCode}). ` +
        `Reconnecting: ${!isLoggedOut}`
      )

      if (!isLoggedOut) {
        // Network blip → exponential backoff: 2s, 4s, 8s, ... capped at 60s
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000)
        reconnectAttempts++
        setTimeout(connect, delay)
      } else {
        // Logged out — session lost. No point clearing auth (it's already invalid).
        // Exit so Docker restarts fresh, showing a QR for re-pair.
        logger.error('🔴 Logged out from WhatsApp. Restarting for fresh QR...')
        process.exit(0)
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0
      logger.info(`🌕 ${config.serviceName} connected to WhatsApp`)
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
  logger.fatal({ err }, `Failed to start ${config.serviceName}`)
  process.exit(1)
})
