import type { Lead, Temperature } from '@/types'

export interface LeadScore {
  temperature: Temperature
  tempColor: string
  tempIcon: string
  qualityScore: number
}

const temperatureConfig = {
  Hot: { color: 'bg-red-200 text-red-700', icon: 'ph-thermometer-hot' },
  Warm: { color: 'bg-amber-200 text-amber-700', icon: 'ph-thermometer-simple' },
  Cold: { color: 'bg-blue-200 text-blue-700', icon: 'ph-thermometer-cold' },
  '': { color: 'bg-slate-200 text-slate-700', icon: 'ph-thermometer' }
}

export function useLeadScoring() {
  /**
   * Get temperature info for a lead
   */
  function getTemperatureScore(lead: Lead): Omit<LeadScore, 'qualityScore'> {
    const temp = lead.temperature || ''
    const config = temperatureConfig[temp as keyof typeof temperatureConfig]

    return {
      temperature: temp as Temperature,
      tempColor: config.color,
      tempIcon: config.icon
    }
  }

  /**
   * Calculate overall lead quality score (0-100)
   * Based on completeness and engagement signals
   */
  function calculateQualityScore(lead: Lead): number {
    let score = 0

    // Data completeness (40 points)
    if (lead.name) score += 8
    if (lead.email) score += 8
    if (lead.phone) score += 8
    if (lead.location) score += 8
    if (lead.interest) score += 8

    // Engagement signals (30 points)
    if (lead.activities && lead.activities.length > 0) score += 10
    if (lead.tasks && lead.tasks.filter(t => t.status === 'pending').length > 0) score += 10
    if (lead.value && lead.value > 0) score += 10

    // Status quality (20 points)
    if (lead.status === 'Proposal') score += 10
    if (lead.status === 'Won') score += 20
    if (lead.status === 'Lost') score = Math.max(0, score - 10)

    // Temperature bonus (10 points)
    if (lead.temperature === 'Hot') score += 10
    else if (lead.temperature === 'Warm') score += 5

    return Math.min(100, score)
  }

  /**
   * Get lead priority level
   */
  function getPriorityLevel(lead: Lead): 'critical' | 'high' | 'medium' | 'low' {
    const score = calculateQualityScore(lead)

    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * Format currency in INR
   */
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  /**
   * Calculate pipeline metrics
   */
  function calculatePipelineMetrics(leads: Lead[]) {
    const total = leads.length
    const byStatus = {
      New: leads.filter(l => l.status === 'New').length,
      Contacted: leads.filter(l => l.status === 'Contacted').length,
      Proposal: leads.filter(l => l.status === 'Proposal').length,
      Won: leads.filter(l => l.status === 'Won').length,
      Lost: leads.filter(l => l.status === 'Lost').length
    }

    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)
    const wonValue = leads
      .filter(l => l.status === 'Won')
      .reduce((sum, l) => sum + (l.value || 0), 0)
    const conversionRate = total > 0 ? ((byStatus.Won / total) * 100).toFixed(1) : '0'

    return {
      total,
      byStatus,
      totalValue,
      wonValue,
      conversionRate
    }
  }

  return {
    getTemperatureScore,
    calculateQualityScore,
    getPriorityLevel,
    formatCurrency,
    calculatePipelineMetrics
  }
}
