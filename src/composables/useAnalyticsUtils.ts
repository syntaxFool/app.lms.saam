import type { Lead } from '@/types'

export interface GroupedRow {
  key: string
  total: number
  won: number
  convRate: number
  totalValue: number
  avgDealValue: number
}

export function useAnalyticsUtils() {
  function safePercent(won: number, total: number): number {
    return total > 0 ? Math.round((won / total) * 100) : 0
  }

  function groupByField(leads: Lead[], getter: (l: Lead) => string): GroupedRow[] {
    const map: Record<string, { total: number; won: number; totalValue: number }> = {}
    leads.forEach(l => {
      const key = getter(l) || 'Unknown'
      if (!map[key]) map[key] = { total: 0, won: 0, totalValue: 0 }
      map[key].total++
      if (l.status === 'Won') {
        map[key].won++
        map[key].totalValue += l.value || 0
      }
    })
    return Object.entries(map).map(([key, d]) => ({
      key,
      ...d,
      convRate: safePercent(d.won, d.total),
      avgDealValue: d.won > 0 ? Math.round(d.totalValue / d.won) : 0
    }))
  }

  function weekStartISO(date: Date): string {
    const d = new Date(date)
    d.setDate(d.getDate() - (d.getDay() || 7) + 1)
    return d.toISOString().split('T')[0]
  }

  function formatINR(value: number): string {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
    return `₹${value}`
  }

  return { safePercent, groupByField, weekStartISO, formatINR }
}
