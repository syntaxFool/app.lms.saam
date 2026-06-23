"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJidToLmsPhone = normalizeJidToLmsPhone;
exports.resolveContactPhone = resolveContactPhone;
const baileys_1 = require("@whiskeysockets/baileys");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("./config");
// ─── Sync normalization (handles device suffixes) ──────────────────────────
function normalizeJidToLmsPhone(jid) {
    // Step 1: Get the raw identifier before @domain
    const beforeAt = jid.split('@')[0];
    if (!beforeAt) {
        throw new Error(`Cannot normalize empty JID: ${jid}`);
    }
    // Step 2: Strip device suffix (:1, :2, etc.) BEFORE stripping non-digits.
    //   This prevents the device number from merging into the phone digits.
    const phonePart = beforeAt.split(':')[0];
    if (!phonePart) {
        throw new Error(`Cannot normalize empty JID after removing device suffix: ${jid}`);
    }
    // Step 3: Now safely remove any remaining non-digit characters
    const digits = phonePart.replace(/\D/g, '');
    if (digits.length === 0) {
        throw new Error(`Cannot normalize empty JID: ${jid}`);
    }
    // ─── Known patterns ───
    // 10 digits — assume Indian number, prepend +91
    if (digits.length === 10) {
        return `+91 ${digits}`;
    }
    // 12 digits starting with 91 — Indian with country code
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2)}`;
    }
    // 11 digits starting with 1 — US/Canada
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 ${digits.slice(1)}`;
    }
    // 11 digits starting with 61 — Australia
    if (digits.length === 11 && digits.startsWith('61')) {
        return `+61 ${digits.slice(2)}`;
    }
    // ─── General international (11-15 digits) ───
    if (digits.length >= 11 && digits.length <= 15) {
        // Try shorter country codes first (1-digit, 2-digit, 3-digit)
        // Most country codes are 1-2 digits. 3-digit codes like +212 are rare.
        for (const ccLen of [1, 2, 3]) {
            const cc = digits.slice(0, ccLen);
            const local = digits.slice(ccLen);
            if (local.length >= 7 && local.length <= 12) {
                return `+${cc} ${local}`;
            }
        }
    }
    // ─── Fallback ───
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
}
/**
 * Extract the raw JID local part (before @ and : suffixes).
 * Used as a consistent fallback identifier for LID users.
 */
function jidLocalPart(jid) {
    return jid.split('@')[0]?.split(':')[0] || '';
}
/**
 * Try to resolve a LID (Login ID) to a real phone number using Baileys'
 * locally-stored LID mapping files. WhatsApp stores these in the auth directory
 * during sync — they map LIDs to real phone numbers for privacy-enabled users.
 *
 * File naming:
 *   lid-mapping-{LID}_reverse.json  → contains phone number as JSON string
 *   lid-mapping-{PHONE}.json        → contains LID as JSON string
 *
 * These are stored in the auth directory (config.authDir, e.g. auth_info_moon/).
 */
function resolvePhoneFromLidMapping(jid) {
    try {
        // Extract LID from JID (format: "99149454270641@lid")
        const beforeAt = jid.split('@')[0];
        if (!beforeAt)
            return null;
        const lid = beforeAt.split(':')[0];
        if (!lid || lid.length === 0)
            return null;
        // Build path to reverse mapping file
        const mappingFile = path.join(process.cwd(), config_1.config.authDir, `lid-mapping-${lid}_reverse.json`);
        if (fs.existsSync(mappingFile)) {
            const phone = fs.readFileSync(mappingFile, 'utf-8').trim().replace(/^"|"$/g, '');
            if (phone && phone.length > 0) {
                // Format phone like other numbers in the system
                return normalizeJidToLmsPhone(phone + '@s.whatsapp.net');
            }
        }
        return null;
    }
    catch (err) {
        console.error(`[🌕] LID mapping lookup failed for ${jid}:`, err);
        return null;
    }
}
/**
 * Resolve a WhatsApp JID to a verified phone number using WhatsApp's
 * contact lookup APIs.
 *
 * Strategy (tried in order):
 *   1. Normalize JID → call onWhatsApp(phone) — confirms number exists
 *   2. If onWhatsApp returns a LID → candidate is JID-derived, NOT the real phone.
 *      Fall through to USync which queries by JID and may return the real phone.
 *   3. Try USync query by JID directly — the response may contain the
 *      phone-based JID (not just the LID), which we can normalize.
 *   4. Try local LID mapping files (stored by Baileys) — contain real phone for LID users.
 *   5. Last resort: use raw JID identifier as phone.
 */
async function resolveContactPhone(jid, sock) {
    const candidate = normalizeJidToLmsPhone(jid);
    const rawId = jidLocalPart(jid);
    try {
        let isLidUser = false;
        // ── Step 1: Try onWhatsApp with the normalized phone ──
        const results = await sock.onWhatsApp(candidate);
        if (results && results.length > 0) {
            const entry = results[0];
            if (entry.exists) {
                if (entry.lid) {
                    // LID user — the JID doesn't contain the real phone number.
                    // The candidate from normalizeJidToLmsPhone is unreliable.
                    // Skip to USync query which queries by JID directly.
                    console.log(`[🌕] LID user detected. Candidate ${candidate} is JID-derived, not real phone. Trying USync...`);
                    isLidUser = true;
                }
                else {
                    // Non-LID user — JID contains the real phone number
                    const confirmedBase = (entry.jid?.split('@')[0]?.split(':')[0] || '').replace(/\D/g, '');
                    const originalBase = rawId.replace(/\D/g, '');
                    if (confirmedBase && confirmedBase === originalBase) {
                        // Confirmed — phone number matches the sender's JID
                        const verified = normalizeJidToLmsPhone(entry.jid);
                        return { phone: verified, verified: true, lid: false };
                    }
                    // Mismatch — use the confirmed JID's phone
                    if (entry.jid) {
                        const fallback = normalizeJidToLmsPhone(entry.jid);
                        return { phone: fallback, verified: true, lid: false };
                    }
                }
            }
        }
        // ── Step 2: Try USync query by JID (for LID users or when onWhatsApp returns nothing) ──
        // When querying by LID JID with contact+LID protocols, WhatsApp may
        // return the phone-based JID in the user node's `jid` attribute.
        if (isLidUser || !results || results.length === 0) {
            // ── Step 2a: Try local LID mapping files (fast, no API calls) ──
            if (isLidUser) {
                const mappedPhone = resolvePhoneFromLidMapping(jid);
                if (mappedPhone) {
                    console.log(`[🌕] 📞 LID mapping resolved: ${jid} → ${mappedPhone}`);
                    return { phone: mappedPhone, verified: true, lid: false };
                }
            }
            // ── Step 2b: Try USync query by JID ──
            console.log(`[🌕] 🔍 Trying USync by JID for ${jid}...`);
            const jidPhone = await resolvePhoneByJid(jid, sock);
            if (jidPhone) {
                return { phone: jidPhone, verified: true, lid: false };
            }
        }
        // ── Step 3: All lookups failed — use raw JID as phone identifier ──
        // This captures the lead even when WhatsApp privacy prevents resolution.
        // The phone will look like a JID identifier — mark for manual review.
        console.log(`[🌕] ⚠️ Could not resolve phone for ${jid}. Using raw identifier: ${rawId}`);
        return { phone: rawId, verified: false, lid: true };
    }
    catch (err) {
        console.error(`[🌕] WhatsApp lookup failed for ${candidate}:`, err);
        // Fallback to raw JID on unexpected errors too
        return { phone: rawId, verified: false, lid: true };
    }
}
/**
 * Try to resolve a phone number by querying WhatsApp's USync endpoint
 * directly with the user's JID (which may be a LID).
 *
 * The USync response includes the user's JID (which might be the phone-based
 * JID even when querying by LID). We normalize that to get the phone.
 */
async function resolvePhoneByJid(jid, sock) {
    try {
        const query = new baileys_1.USyncQuery()
            .withContactProtocol()
            .withLIDProtocol();
        query.withUser(new baileys_1.USyncUser().withId(jid));
        const result = await sock.executeUSyncQuery(query);
        if (!result?.list?.length)
            return null;
        const entry = result.list[0];
        // entry.id is the JID from the response (might be phone-based JID)
        // entry.contact is true/false (whether contact exists)
        // entry.lid is the LID value
        if (entry && entry.id) {
            // Check if the returned JID gives us a valid phone
            const phoneFromJid = normalizeJidToLmsPhone(entry.id);
            // If the JID has digits that look like a real phone (12 digits starting with 91, etc.)
            const digits = entry.id.replace(/@.*$/, '').replace(/\D/g, '');
            if (digits.length >= 10 && digits.length <= 15) {
                console.log(`[Moon] 📞 USync JID lookup resolved: ${entry.id} → ${phoneFromJid}`);
                return phoneFromJid;
            }
        }
        return null;
    }
    catch (err) {
        console.error(`[Moon] USync JID lookup failed:`, err);
        return null;
    }
}
