<template>
  <div class="h-full w-full overflow-auto bg-slate-50">
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-800 mb-2">📊 Analytics Dashboard</h1>
          <p class="text-slate-500">Pipeline performance, conversion metrics, and team insights</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-slate-600 font-medium">Filter by:</label>
          <select
            v-model="dateFilter"
            @change="updateReports"
            class="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="till-date">Till Date</option>
            <option value="this-day">This Day</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="this-year">This Year</option>
          </select>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total Leads -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl shadow-sm border border-blue-200 p-6 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-600 text-sm font-semibold">Total Leads</p>
              <p class="text-4xl font-bold text-blue-900 mt-2">{{ metrics.total }}</p>
              <p class="text-xs text-blue-500 mt-2">Active in pipeline</p>
            </div>
            <i class="ph-bold ph-users text-5xl text-blue-400 opacity-30"></i>
          </div>
        </div>

        <!-- Pipeline Value -->
        <div class="bg-gradient-to-br from-green-50 to-green-50 rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-600 text-sm font-semibold">Pipeline Value</p>
              <p class="text-3xl font-bold text-green-900 mt-2">{{ formatCurrency(metrics.totalValue) }}</p>
              <p class="text-xs text-green-500 mt-2">Total opportunity</p>
            </div>
            <i class="ph-bold ph-currency-inr text-5xl text-green-400 opacity-30"></i>
          </div>
        </div>

        <!-- Won Deals -->
        <div class="bg-gradient-to-br from-emerald-50 to-emerald-50 rounded-xl shadow-sm border border-emerald-200 p-6 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-emerald-600 text-sm font-semibold">Won Deals</p>
              <p class="text-4xl font-bold text-emerald-900 mt-2">{{ metrics.byStatus.Won }}</p>
              <p class="text-xs text-emerald-500 mt-2">{{ formatCurrency(metrics.wonValue) }} closed</p>
            </div>
            <i class="ph-bold ph-trophy text-5xl text-emerald-400 opacity-30"></i>
          </div>
        </div>

        <!-- Conversion Rate -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-50 rounded-xl shadow-sm border border-purple-200 p-6 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-600 text-sm font-semibold">Conversion Rate</p>
              <p class="text-4xl font-bold text-purple-900 mt-2">{{ metrics.conversionRate }}%</p>
              <p class="text-xs text-purple-500 mt-2">Win to total ratio</p>
            </div>
            <i class="ph-bold ph-trend-up text-5xl text-purple-400 opacity-30"></i>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Pipeline Status -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4">Pipeline by Status</h2>
          <div class="space-y-3">
            <div
              v-for="(count, status) in metrics.byStatus"
              :key="status"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="getStatusColor(status as keyof typeof metrics.byStatus)"
                ></div>
                <span class="text-sm font-medium text-slate-700">{{ status }}</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full"
                    :class="getStatusColor(status as keyof typeof metrics.byStatus)"
                    :style="{ width: `${metrics.total > 0 ? (count / metrics.total) * 100 : 0}%` }"
                  ></div>
                </div>
                <span class="text-sm font-bold text-slate-700 w-8 text-right">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Temperature Distribution -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4">Lead Temperature</h2>
          <div class="space-y-3">
            <div v-for="(count, temp) in tempDistribution" :key="temp" class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-700">{{ temp || 'Not Set' }}</span>
              <div class="flex items-center gap-4">
                <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full"
                    :class="getTempColor(temp)"
                    :style="{ width: `${metrics.total > 0 ? (count / metrics.total) * 100 : 0}%` }"
                  ></div>
                </div>
                <span class="text-sm font-bold text-slate-700 w-8 text-right">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Performance -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i class="ph-bold ph-users text-blue-600"></i> Agent Performance
        </h2>
        <div v-if="Object.keys(agentMetrics).length > 0" class="overflow-x-auto">
          <table class="w-full text-sm text-slate-700">
            <thead>
              <tr class="border-b-2 border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold bg-slate-50">
                <th class="pb-3 px-4 font-bold text-left">Agent Name</th>
                <th class="pb-3 px-4 font-bold text-center">Assigned</th>
                <th class="pb-3 px-4 font-bold text-center">Won ✓</th>
                <th class="pb-3 px-4 font-bold text-center">Lost ✗</th>
                <th class="pb-3 px-4 font-bold text-center">Win Rate</th>
                <th class="pb-3 px-4 font-bold text-right">Pipeline Value</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(agentData, key) in agentMetrics" :key="key" class="hover:bg-slate-50 transition">
                <td class="py-4 px-4 font-semibold text-slate-800">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                      {{ agentData.name?.charAt(0).toUpperCase() }}
                    </span>
                    {{ agentData.name }}
                  </div>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                    {{ agentData.assigned }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 font-bold text-sm">
                    {{ agentData.won }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-sm">
                    {{ agentData.lost }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        class="h-full"
                        :style="{
                          width: `${Math.min(100, agentData.winRate)}%`,
                          backgroundColor: agentData.winRate >= 50 ? '#10b981' : agentData.winRate >= 25 ? '#f59e0b' : '#ef4444'
                        }"
                      ></div>
                    </div>
                    <span class="font-bold text-sm w-10 text-right">{{ agentData.winRate }}%</span>
                  </div>
                </td>
                <td class="py-4 px-4 text-right font-bold text-slate-800">
                  {{ formatCurrency(agentData.pipelineValue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8">
          <p class="text-slate-500">No agent data available. Add users to see performance metrics.</p>
        </div>
      </div>

      <!-- Analytics Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnelChart :leads="filteredLeads" />
        <PipelineValueChart :leads="filteredLeads" />
      </div>

      <div class="grid grid-cols-1">
        <LeadSourceChart :leads="filteredLeads" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Lead, User } from '@/types'
import { useLeadScoring } from '@/composables/useLeadScoring'
import ConversionFunnelChart from '@/components/charts/ConversionFunnelChart.vue'
import PipelineValueChart from '@/components/charts/PipelineValueChart.vue'
import LeadSourceChart from '@/components/charts/LeadSourceChart.vue'

const props = defineProps<{
  leads: Lead[]
  users?: User[]
}>()

const { formatCurrency, calculatePipelineMetrics } = useLeadScoring()

const dateFilter = ref('till-date')

const filteredLeads = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return props.leads.filter(lead => {
    const leadDate = new Date(lead.createdAt)
    leadDate.setHours(0, 0, 0, 0)

    switch (dateFilter.value) {
      case 'this-day':
        return leadDate.getTime() === today.getTime()
      case 'this-week': {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return leadDate >= weekStart && leadDate <= weekEnd
      }
      case 'this-month':
        return leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear()
      case 'this-year':
        return leadDate.getFullYear() === today.getFullYear()
      case 'till-date':
      default:
        return true
    }
  })
})

const metrics = computed(() => calculatePipelineMetrics(filteredLeads.value))

const tempDistribution = computed(() => {
  const dist: Record<string, number> = { Hot: 0, Warm: 0, Cold: 0, 'Not Set': 0 }
  filteredLeads.value.forEach(lead => {
    const temp = lead.temperature || 'Not Set'
    if (dist.hasOwnProperty(temp)) dist[temp]++
    else dist['Not Set']++
  })
  return dist
})

const agentMetrics = computed(() => {
  const agents: Record<string, any> = {}

  if (props.users) {
    props.users.forEach(user => {
      const key = user.username || user.id
      const assigned = filteredLeads.value.filter(l => l.assignedTo === key).length
      const won = filteredLeads.value.filter(l => l.assignedTo === key && l.status === 'Won').length
      const lost = filteredLeads.value.filter(l => l.assignedTo === key && l.status === 'Lost').length
      const pipelineValue = filteredLeads.value
        .filter(l => l.assignedTo === key)
        .reduce((sum, l) => sum + (l.value || 0), 0)

      agents[key] = {
        name: user.name,
        assigned,
        won,
        lost,
        winRate: assigned > 0 ? Math.round((won / assigned) * 100) : 0,
        pipelineValue
      }
    })
  }

  return agents
})

function updateReports() {
  // Trigger any necessary updates when date filter changes
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    New: 'bg-blue-500',
    Contacted: 'bg-yellow-500',
    Proposal: 'bg-purple-500',
    Won: 'bg-green-500',
    Lost: 'bg-red-500'
  }
  return colors[status] || 'bg-slate-500'
}

function getTempColor(temp: string): string {
  const colors: Record<string, string> = {
    Hot: 'bg-red-500',
    Warm: 'bg-amber-500',
    Cold: 'bg-blue-500',
    'Not Set': 'bg-slate-300'
  }
  return colors[temp] || 'bg-slate-300'
}
</script>
