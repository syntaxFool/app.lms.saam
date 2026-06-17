// ==================== LEAD OPTIONS CONSTANTS ====================
// Single source of truth for dropdown options across all components.
// Sources and interests are fetched from the /settings API (app store).
// Locations are a merged list from FilterSheet + LeadModal.

/**
 * All unique Indian cities from FilterSheet (9) + LeadModal (16).
 * Sorted alphabetically for consistent ordering.
 */
export const LEAD_LOCATIONS = [
  'Ahmedabad',
  'Bangalore',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Kanpur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Nagpur',
  'Pune',
  'Surat',
  'Other',
] as const

export type LeadLocation = typeof LEAD_LOCATIONS[number]

/**
 * Lead status options (core domain enum).
 */
export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Proposal',
  'Won',
  'Lost',
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]

/**
 * Temperature options with emoji labels.
 */
export const TEMPERATURE_OPTIONS = [
  { value: 'Hot', label: '🔴 Hot' },
  { value: 'Warm', label: '🟠 Warm' },
  { value: 'Cold', label: '🔵 Cold' },
] as const

export type Temperature = typeof TEMPERATURE_OPTIONS[number]['value'] | ''

/**
 * Tailwind badge classes for each lead status.
 */
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Proposal: 'bg-purple-100 text-purple-800',
  Won: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
}

/**
 * Temperature color classes for text.
 */
export const TEMPERATURE_COLORS: Record<string, string> = {
  Hot: 'text-red-600',
  Warm: 'text-orange-600',
  Cold: 'text-blue-600',
}

/**
 * Temperature emoji mapping.
 */
export const TEMPERATURE_EMOJI: Record<string, string> = {
  Hot: '🔴',
  Warm: '🟠',
  Cold: '🔵',
}
