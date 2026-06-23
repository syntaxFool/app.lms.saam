"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const baileys_1 = require("@whiskeysockets/baileys");
const pino_1 = __importDefault(require("pino"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const handler_1 = require("./handler");
const config_1 = require("./config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
const AUTH_DIR = config_1.config.authDir;
let reconnectAttempts = 0;
function logQrAsText(qr) {
    // Also log as a base64 data URL so it's visible as clickable link in logs
    const base64 = Buffer.from(qr).toString('base64');
    logger.info(`📱 QR as base64 data URL (open in browser to scan):`);
    logger.info(`data:image/png;base64,${base64}`);
    // Render ASCII QR to terminal
    qrcode_terminal_1.default.generate(qr, { small: true });
    logger.info(`📱 Or scan the QR code above with WhatsApp to connect ${config_1.config.serviceName}`);
}
function clearStaleAuth() {
    try {
        if (fs.existsSync(AUTH_DIR)) {
            // Delete all files inside (works on bind mounts — can't rmdir the mount point)
            const files = fs.readdirSync(AUTH_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(AUTH_DIR, file));
            }
            logger.info('🧹 Cleared stale WhatsApp auth session. Next startup will show fresh QR.');
        }
    }
    catch (err) {
        logger.warn({ err }, 'Could not clear stale auth files (may already be clean)');
    }
}
async function connect() {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(AUTH_DIR);
    const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
    logger.info(`🌕 ${config_1.config.serviceName} rising... Baileys v${version.join('.')}, latest=${isLatest}`);
    // Set up proxy if configured (for networks that block WhatsApp)
    let agent = undefined;
    if (config_1.config.proxyUrl) {
        if (config_1.config.proxyUrl.startsWith('socks')) {
            const { SocksProxyAgent } = require('socks-proxy-agent');
            agent = new SocksProxyAgent(config_1.config.proxyUrl);
        }
        else {
            const { HttpsProxyAgent } = require('https-proxy-agent');
            agent = new HttpsProxyAgent(config_1.config.proxyUrl);
        }
        logger.info(`🔌 Using proxy: ${config_1.config.proxyUrl}`);
    }
    const sock = (0, baileys_1.makeWASocket)({
        version,
        auth: state,
        logger: logger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        agent,
        syncFullHistory: false,
        fireInitQueries: false,
    });
    // Persist credentials when they update (important for session persistence)
    sock.ev.on('creds.update', saveCreds);
    // Track whether we've already attempted pairing to avoid duplicates on reconnect
    let pairingAttempted = false;
    // Handle connection state changes with auto-reconnect
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        // ── Request pairing code when socket is in connecting state ──
        // Must happen after connection.update fires (not via setTimeout race)
        if (config_1.config.moonPhone && connection === 'connecting' && !pairingAttempted) {
            pairingAttempted = true;
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(config_1.config.moonPhone);
                    logger.info(`📱 Pairing code: ${code}`);
                    logger.info(`📱 Open WhatsApp → Linked Devices → Link a Device → enter: ${code}`);
                }
                catch (err) {
                    logger.warn({ err }, 'Pairing code request failed, falling back to QR');
                }
            }, 1000);
        }
        // Show QR code in terminal for WhatsApp pairing
        if (qr) {
            logQrAsText(qr);
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message || 'unknown';
            const isLoggedOut = statusCode === baileys_1.DisconnectReason.loggedOut;
            logger.warn(`Connection closed. Reason: ${reason} (code ${statusCode}). ` +
                `Reconnecting: ${!isLoggedOut}`);
            if (!isLoggedOut) {
                // Network blip → exponential backoff: 2s, 4s, 8s, ... capped at 60s
                const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000);
                reconnectAttempts++;
                setTimeout(connect, delay);
            }
            else {
                // Logged out — session lost. No point clearing auth (it's already invalid).
                // Exit so Docker restarts fresh, showing a QR for re-pair.
                logger.error('🔴 Logged out from WhatsApp. Restarting for fresh QR...');
                process.exit(0);
            }
        }
        else if (connection === 'open') {
            reconnectAttempts = 0;
            logger.info(`🌕 ${config_1.config.serviceName} connected to WhatsApp`);
        }
    });
    // Handle incoming messages — the core functionality
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            try {
                await (0, handler_1.handleIncomingMessage)(msg, sock);
            }
            catch (err) {
                logger.error({ err }, 'Unhandled error in message handler');
            }
        }
    });
}
// Start Moon
connect().catch((err) => {
    logger.fatal({ err }, `Failed to start ${config_1.config.serviceName}`);
    process.exit(1);
});
