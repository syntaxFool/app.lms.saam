/**
 * Composable for comprehensive date utilities
 * Provides timezone-aware formatting, parsing, and calculations
 */
export function useDateUtils() {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000 // 5:30 hours

  /**
   * Get IST date for timezone-aware comparisons
   */
  function getISTDate(date: Date = new Date()): Date {
    if (isNaN(date.getTime())) return new Date()
    const utcTime = date.getTime()
    return new Date(utcTime + IST_OFFSET)
  }

  /**
   * Get current date in IST as YYYY-MM-DD string
   */
  function getTodayIST(): string {
    const istDate = getISTDate()
    return formatToISO(istDate)
  }

  /**
   * Format date to YYYY-MM-DD ISO format
   */
  function formatToISO(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Format date to readable format DD/MM/YYYY
   */
  function formatToDisplay(dateString: string): string {
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
   * Format date to long format (e.g., "December 20, 2025")
   */
  function formatToLong(dateString: string, locale = 'en-IN'): string {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const istDate = getISTDate(date)
      return istDate.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  /**
   * Format date with time (e.g., "Dec 20, 2025 10:30 AM")
   */
  function formatToDateTime(dateString: string, locale = 'en-IN'): string {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const istDate = getISTDate(date)
      return istDate.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  /**
   * Get relative time string (e.g., "2 days ago", "in 3 hours")
   */
  function getRelativeTime(dateString: string): string {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const istDate = getISTDate(date)
      const now = new Date()
      const diffMs = now.getTime() - istDate.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) return 'just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} month${months > 1 ? 's' : ''} ago`
      }
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''} ago`
    } catch {
      return dateString
    }
  }

  /**
   * Parse date string to Date object
   */
  function parseDate(dateString: string): Date | null {
    if (!dateString) return null
    try {
      return new Date(dateString)
    } catch {
      return null
    }
  }

  /**
   * Check if date is in the past
   */
  function isPast(dateString: string): boolean {
    const date = parseDate(dateString)
    if (!date) return false
    const today = getTodayIST()
    const dateISO = formatToISO(date)
    return dateISO < today
  }

  /**
   * Check if date is today
   */
  function isToday(dateString: string): boolean {
    const date = parseDate(dateString)
    if (!date) return false
    const today = getTodayIST()
    const dateISO = formatToISO(date)
    return dateISO === today
  }

  /**
   * Check if date is in the future
   */
  function isFuture(dateString: string): boolean {
    const date = parseDate(dateString)
    if (!date) return false
    const today = getTodayIST()
    const dateISO = formatToISO(date)
    return dateISO > today
  }

  /**
   * Get days difference between two dates
   */
  function getDaysDifference(startDate: string, endDate: string): number {
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    if (!start || !end) return 0
    const diffMs = end.getTime() - start.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  /**
   * Add days to date
   */
  function addDays(dateString: string, days: number): string {
    const date = parseDate(dateString)
    if (!date) return dateString
    date.setDate(date.getDate() + days)
    return formatToISO(date)
  }

  /**
   * Get start of month
   */
  function getStartOfMonth(dateString?: string): string {
    const date = dateString ? parseDate(dateString) : new Date()
    if (!date) return formatToISO(new Date())
    const first = new Date(date.getFullYear(), date.getMonth(), 1)
    return formatToISO(first)
  }

  /**
   * Get end of month
   */
  function getEndOfMonth(dateString?: string): string {
    const date = dateString ? parseDate(dateString) : new Date()
    if (!date) return formatToISO(new Date())
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return formatToISO(last)
  }

  /**
   * Get week number of year
   */
  function getWeekNumber(dateString: string): number {
    const date = parseDate(dateString)
    if (!date) return 0
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  /**
   * Check if year is leap year
   */
  function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }

  return {
    getISTDate,
    getTodayIST,
    formatToISO,
    formatToDisplay,
    formatToLong,
    formatToDateTime,
    getRelativeTime,
    parseDate,
    isPast,
    isToday,
    isFuture,
    getDaysDifference,
    addDays,
    getStartOfMonth,
    getEndOfMonth,
    getWeekNumber,
    isLeapYear
  }
}
