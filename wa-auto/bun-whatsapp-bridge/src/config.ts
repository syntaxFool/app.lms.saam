import dotenv from 'dotenv'
dotenv.config()

export const config = {
  lmsApiUrl: process.env.LMS_API_URL || 'http://localhost:8080/api',
  moonApiKey: process.env.MOON_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  // WhatsApp phone number (with country code, no +/spaces) for pairing code auth
  // e.g. "918828022801" for +91 8828022801
  // If set, uses pairing code instead of QR for linking
  moonPhone: process.env.MOON_PHONE || '',
  // SOCKS5 proxy URL for WhatsApp WebSocket connections (e.g. "socks5://warp:1080")
  // Use when the office network blocks direct connections to WhatsApp servers
  proxyUrl: process.env.MOON_PROXY || '',
  // Auth directory name (defaults to "auth_info_moon")
  // Set to "auth_info_bun" for Bun (HP WhatsApp bridge)
  authDir: process.env.AUTH_DIR || 'auth_info_moon',
  // Service display name in logs (defaults to "Moon")
  // Set to "Bun" for the HP WhatsApp bridge
  serviceName: process.env.SERVICE_NAME || 'Moon',
}
