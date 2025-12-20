import { ref } from 'vue'
import type { Lead } from '@/types'

export interface ConflictField {
  field: string
  yours: any
  theirs: any
  current: any
}

export interface ConflictInfo {
  detected: boolean
  conflicts: ConflictField[]
  leadId: string
  leadName: string
}

export function useConflictDetection() {
  const conflictInfo = ref<ConflictInfo | null>(null)
  const showConflictDialog = ref(false)

  /**
   * Detect if a lead was modified by comparing snapshots
   */
  function detectFieldConflicts(
    snapshot: Lead,
    current: Lead,
    userChanges: Partial<Lead>
  ): ConflictField[] {
    const fieldsToCheck = [
      'name',
      'email',
      'phone',
      'status',
      'temperature',
      'interest',
      'value',
      'location',
      'source',
      'assignedTo',
      'notes',
      'lostReason'
    ]

    const conflicts: ConflictField[] = []

    fieldsToCheck.forEach(field => {
      const snapshotVal = snapshot[field as keyof Lead]
      const currentVal = current[field as keyof Lead]

      if (snapshotVal !== currentVal) {
        conflicts.push({
          field,
          yours: userChanges[field as keyof Lead] ?? snapshotVal,
          theirs: currentVal,
          current: currentVal
        })
      }
    })

    return conflicts
  }

  /**
   * Show conflict resolution dialog
   */
  function showConflict(lead: Lead, conflicts: ConflictField[]): void {
    conflictInfo.value = {
      detected: true,
      conflicts,
      leadId: lead.id,
      leadName: lead.name
    }
    showConflictDialog.value = true
  }

  /**
   * Hide conflict dialog
   */
  function hideConflict(): void {
    showConflictDialog.value = false
    conflictInfo.value = null
  }

  /**
   * Resolve conflict by choosing server version or keeping local changes
   */
  function resolveConflict(choice: 'yours' | 'theirs'): { leadId: string; choice: 'yours' | 'theirs' } | null {
    if (!conflictInfo.value) return null

    const result = {
      leadId: conflictInfo.value.leadId,
      choice
    }

    hideConflict()
    return result
  }

  /**
   * Format conflict field name
   */
  function formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  /**
   * Format conflict value for display
   */
  function formatConflictValue(value: any, field: string): string {
    if (value === null || value === undefined) return '(empty)'
    if (field === 'value' && typeof value === 'number') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value)
    }
    return String(value)
  }

  return {
    conflictInfo,
    showConflictDialog,
    detectFieldConflicts,
    showConflict,
    hideConflict,
    resolveConflict,
    formatFieldName,
    formatConflictValue
  }
}
