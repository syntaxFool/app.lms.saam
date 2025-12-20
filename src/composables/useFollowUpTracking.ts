import type { Lead } from '@/types'

export function useFollowUpTracking() {
  /**
   * Get IST date for timezone-aware comparisons
   */
  function getISTDate(date: Date = new Date()): Date {
    if (isNaN(date.getTime())) return new Date()
    const utcTime = date.getTime()
    return new Date(utcTime + 5.5 * 60 * 60 * 1000) // Add 5:30 hours
  }

  /**
   * Get today's date in IST as YYYY-MM-DD string
   */
  function getISTToday(): string {
    const istDate = getISTDate()
    const year = istDate.getFullYear()
    const month = String(istDate.getMonth() + 1).padStart(2, '0')
    const day = String(istDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Format date to readable format
   */
  function formatDate(dateString: string): string {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const istDate = getISTDate(date)
      const day = String(istDate.getDate()).padStart(2, '0')
      const month = String(istDate.getMonth() + 1).padStart(2, '0')
      const year = istDate.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  /**
   * Get follow-up date from a lead
   * Priority: activity follow_up > explicit followUpDate > earliest task due date
   */
  function getFollowUpDate(lead: Lead): string | null {
    // Check follow_up activity
    if (lead.activities && lead.activities.length > 0) {
      const followUpActivity = lead.activities.find(a => a.type === 'follow_up')
      if (followUpActivity && followUpActivity.note) {
        let dateStr = followUpActivity.note

        // Convert ISO date to YYYY-MM-DD if needed
        if (dateStr.includes('T') && dateStr.includes('Z')) {
          const istDate = getISTDate(new Date(dateStr))
          const year = istDate.getFullYear()
          const month = String(istDate.getMonth() + 1).padStart(2, '0')
          const day = String(istDate.getDate()).padStart(2, '0')
          dateStr = `${year}-${month}-${day}`
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr
        }
      }
    }

    // Check explicit follow-up date
    if ((lead as any).followUpDate) return (lead as any).followUpDate

    // Check earliest task due date
    if (lead.tasks && lead.tasks.length > 0) {
      const pendingTasks = lead.tasks.filter(t => t.status === 'pending' && t.dueDate)
      if (pendingTasks.length > 0) {
        const earliest = pendingTasks.reduce((min, task) => {
          return new Date(task.dueDate!) < new Date(min.dueDate!) ? task : min
        })
        return earliest.dueDate!
      }
    }

    return null
  }

  /**
   * Check if a lead's follow-up is overdue
   */
  function isFollowUpOverdue(lead: Lead): boolean {
    const followUpDate = getFollowUpDate(lead)
    if (!followUpDate) return false
    const today = getISTToday()
    return followUpDate < today
  }

  /**
   * Check if a lead's follow-up is today
   */
  function isFollowUpToday(lead: Lead): boolean {
    const followUpDate = getFollowUpDate(lead)
    if (!followUpDate) return false
    const today = getISTToday()
    return followUpDate === today
  }

  /**
   * Check if a lead's follow-up is upcoming
   */
  function isFollowUpUpcoming(lead: Lead): boolean {
    const followUpDate = getFollowUpDate(lead)
    if (!followUpDate) return false
    const today = getISTToday()
    return followUpDate > today
  }

  /**
   * Group leads by follow-up status
   */
  function groupLeadsByFollowUp(leads: Lead[]) {
    return {
      overdue: leads.filter(isFollowUpOverdue),
      today: leads.filter(isFollowUpToday),
      upcoming: leads.filter(isFollowUpUpcoming),
      none: leads.filter(l => !getFollowUpDate(l))
    }
  }

  /**
   * Get days until follow-up
   */
  function daysUntilFollowUp(lead: Lead): number | null {
    const followUpDate = getFollowUpDate(lead)
    if (!followUpDate) return null

    const today = new Date(getISTToday())
    const followUp = new Date(followUpDate)
    const diff = followUp.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return {
    getISTDate,
    getISTToday,
    formatDate,
    getFollowUpDate,
    isFollowUpOverdue,
    isFollowUpToday,
    isFollowUpUpcoming,
    groupLeadsByFollowUp,
    daysUntilFollowUp
  }
}
