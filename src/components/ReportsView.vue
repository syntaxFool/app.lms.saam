<template>
  <div class="h-full w-full overflow-auto bg-slate-50">
    <div class="p-3 md:p-6 space-y-4 md:space-y-6">
      <!-- Compact Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ph-bold ph-chart-bar text-primary"></i>
          Analytics
        </h1>
        <div class="flex items-center gap-2">
          <!-- Date Range Button -->
          <button
            @click="showDatePicker = true"
            class="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border-2 border-slate-300 
                   rounded-lg hover:border-slate-400 transition-colors text-sm font-semibold"
          >
            <i class="ph-bold ph-calendar text-lg text-slate-600"></i>
            <span class="hidden sm:inline text-slate-700">{{ dateRangeLabel }}</span>
          </button>
          
          <!-- More Actions Menu -->
          <div class="relative">
            <button
              @click="showExportMenu = !showExportMenu"
              class="p-2 hover:bg-white border-2 border-transparent hover:border-slate-300 
                     rounded-lg transition-colors relative"
              :class="showExportMenu ? 'bg-white border-slate-300' : ''"
            >
              <i class="ph-bold ph-dots-three-vertical text-xl text-slate-600"></i>
            </button>
            
            <!-- Export Dropdown -->
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-if="showExportMenu" class="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button
                  @click="exportToCSV(); showExportMenu = false"
                  class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <i class="ph-bold ph-file-csv text-lg text-green-600"></i>
                  <span>Export to CSV</span>
                </button>
                <button
                  @click="refreshData(); showExportMenu = false"
                  class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <i class="ph-bold ph-arrow-clockwise text-lg text-blue-600"></i>
                  <span>Refresh Data</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
      
      <!-- DateRangePicker Component -->
      <DateRangePicker
        :is-open="showDatePicker"
        :start-date="dateRange.startDate"
        :end-date="dateRange.endDate"
        :preset="dateRange.preset"
        :compare-mode="dateRange.compareMode"
        @close="showDatePicker = false"
        @apply="applyDateRange"
      />

      <!-- Compact KPI Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <!-- Total Leads -->
        <div class="bg-blue-50 rounded-lg md:rounded-xl border-l-4 border-blue-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-blue-600 font-semibold uppercase tracking-wide">Leads</div>
          <div class="text-2xl md:text-3xl font-bold text-blue-900 mt-1">{{ metrics.total }}</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1"
               :class="metricDeltas.total.direction === 'up' ? 'text-green-600' : metricDeltas.total.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.total.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.total.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ Math.abs(metricDeltas.total.value) }} vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-blue-500 mt-1">Active in pipeline</div>
        </div>

        <!-- Pipeline Value -->
        <div class="bg-green-50 rounded-lg md:rounded-xl border-l-4 border-green-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-green-600 font-semibold uppercase tracking-wide">Pipeline</div>
          <div class="text-xl md:text-2xl font-bold text-green-900 mt-1">
            {{ formatCurrency(metrics.totalValue).replace('₹', '₹').replace(',', 'L').substring(0, 6) }}
          </div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1"
               :class="metricDeltas.totalValue.direction === 'up' ? 'text-green-600' : metricDeltas.totalValue.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.totalValue.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.totalValue.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ metricDeltas.totalValue.percentage.toFixed(0) }}% vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-green-500 mt-1">Total opportunity</div>
        </div>

        <!-- Won Deals -->
        <div class="bg-emerald-50 rounded-lg md:rounded-xl border-l-4 border-emerald-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-emerald-600 font-semibold uppercase tracking-wide">Won</div>
          <div class="text-2xl md:text-3xl font-bold text-emerald-900 mt-1">{{ metrics.byStatus.Won }}</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1"
               :class="metricDeltas.won.direction === 'up' ? 'text-green-600' : metricDeltas.won.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.won.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.won.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ Math.abs(metricDeltas.won.value) }} vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-emerald-500 mt-1">{{ formatCurrency(metrics.wonValue) }}</div>
        </div>

        <!-- Conversion Rate -->
        <div class="bg-purple-50 rounded-lg md:rounded-xl border-l-4 border-purple-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-purple-600 font-semibold uppercase tracking-wide">Conv.</div>
          <div class="text-2xl md:text-3xl font-bold text-purple-900 mt-1">{{ metrics.conversionRate }}%</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1"
               :class="metricDeltas.conversionRate.direction === 'up' ? 'text-green-600' : metricDeltas.conversionRate.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.conversionRate.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.conversionRate.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ metricDeltas.conversionRate.percentage.toFixed(1) }}% vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-purple-500 mt-1">Win to total ratio</div>
        </div>
      </div>

      <!-- Pipeline & Temperature Section -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button
          @click="toggleSection('pipeline')"
          class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl"
        >
          <div class="flex items-center gap-3">
            <i :class="sections.pipeline ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Pipeline Breakdown</span>
            <span class="text-xs text-slate-500">({{ metrics.total }} leads)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
            {{ sections.pipeline ? 'Collapse' : 'Expand' }}
          </span>
        </button>
        
        <Transition
          name="expand"
          @enter="onEnter"
          @after-enter="onAfterEnter"
          @leave="onLeave"
          @after-leave="onAfterLeave"
        >
          <div v-if="sections.pipeline" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <!-- Pipeline Status -->
              <div>
                <h2 class="text-base md:text-lg font-bold text-slate-800 mb-4">Pipeline by Status</h2>
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
              <div>
                <h2 class="text-base md:text-lg font-bold text-slate-800 mb-4">Lead Temperature</h2>
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
          </div>
        </Transition>
      </div>

      <!-- Agent Performance Section -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button
          @click="toggleSection('agents')"
          class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl"
        >
          <div class="flex items-center gap-3">
            <i :class="sections.agents ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Agent Performance</span>
            <span class="text-xs text-slate-500">({{ Object.keys(agentMetrics).length }} agents)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
            {{ sections.agents ? 'Collapse' : 'Expand' }}
          </span>
        </button>
        
        <Transition
          name="expand"
          @enter="onEnter"
          @after-enter="onAfterEnter"
          @leave="onLeave"
          @after-leave="onAfterLeave"
        >
          <div v-if="sections.agents" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0">
              <!-- Mobile Cards View -->
              <div v-if="Object.keys(agentMetrics).length > 0" class="md:hidden space-y-3">
                <div v-for="(agentData, key) in agentMetrics" :key="key" class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <!-- Agent Header -->
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                        {{ agentData.name?.charAt(0).toUpperCase() }}
                      </span>
                      <span class="font-semibold text-slate-800">{{ agentData.name }}</span>
                    </div>
                    <span class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                      {{ agentData.assigned }} leads
                    </span>
                  </div>
                  
                  <!-- Metrics Grid -->
                  <div class="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <div class="text-xs text-slate-500 mb-1">Won</div>
                      <div class="text-lg font-bold text-green-600">{{ agentData.won }}</div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-500 mb-1">Lost</div>
                      <div class="text-lg font-bold text-red-600">{{ agentData.lost }}</div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-500 mb-1">Win Rate</div>
                      <div class="text-lg font-bold text-slate-800">{{ agentData.winRate }}%</div>
                    </div>
                  </div>
                  
                  <!-- Win Rate Bar -->
                  <div class="mb-3">
                    <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        class="h-full transition-all duration-300"
                        :style="{
                          width: `${Math.min(100, agentData.winRate)}%`,
                          backgroundColor: agentData.winRate >= 50 ? '#10b981' : agentData.winRate >= 25 ? '#f59e0b' : '#ef4444'
                        }"
                      ></div>
                    </div>
                  </div>
                  
                  <!-- Pipeline Value -->
                  <div class="pt-3 border-t border-slate-200">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-slate-500">Pipeline Value</span>
                      <span class="text-lg font-bold text-slate-800">{{ formatCurrency(agentData.pipelineValue) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Desktop Table View -->
              <div v-if="Object.keys(agentMetrics).length > 0" class="hidden md:block overflow-x-auto">
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
              
              <div v-if="Object.keys(agentMetrics).length === 0" class="text-center py-8">
                <p class="text-slate-500">No agent data available. Add users to see performance metrics.</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Analytics Charts Section -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button
          @click="toggleSection('charts')"
          class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl"
        >
          <div class="flex items-center gap-3">
            <i :class="sections.charts ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Charts & Visualizations</span>
            <span class="text-xs text-slate-500">(3 charts)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
            {{ sections.charts ? 'Collapse' : 'Expand' }}
          </span>
        </button>
        
        <Transition
          name="expand"
          @enter="onEnter"
          @after-enter="onAfterEnter"
          @leave="onLeave"
          @after-leave="onAfterLeave"
        >
          <div v-if="sections.charts" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 space-y-4 md:space-y-6">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <ConversionFunnelChart :leads="filteredLeads" />
                <PipelineValueChart :leads="filteredLeads" />
              </div>

              <div class="grid grid-cols-1">
                <LeadSourceChart :leads="filteredLeads" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Lead, User } from '@/types'
import { useLeadScoring } from '@/composables/useLeadScoring'
import DateRangePicker from '@/components/DateRangePicker.vue'
import ConversionFunnelChart from '@/components/charts/ConversionFunnelChart.vue'
import PipelineValueChart from '@/components/charts/PipelineValueChart.vue'
import LeadSourceChart from '@/components/charts/LeadSourceChart.vue'

const props = defineProps<{
  leads: Lead[]
  users?: User[]
}>()

const { formatCurrency, calculatePipelineMetrics } = useLeadScoring()

// Date range state
const showDatePicker = ref(false)
const showExportMenu = ref(false)
const dateRange = ref({
  startDate: getMonthStart(),
  endDate: getTodayDate(),
  preset: 'this-month',
  compareMode: false
})

// Collapsible sections state
const isMobile = ref(window.innerWidth < 768)
const sections = ref({
  pipeline: !isMobile.value,
  agents: !isMobile.value,
  charts: !isMobile.value
})

// Load saved section states from localStorage
const savedSections = localStorage.getItem('analytics_sections')
if (savedSections) {
  try {
    const parsed = JSON.parse(savedSections)
    sections.value = { ...sections.value, ...parsed }
  } catch (e) {
    // Ignore parse errors
  }
}

// Save section states to localStorage
function toggleSection(section: keyof typeof sections.value) {
  sections.value[section] = !sections.value[section]
  localStorage.setItem('analytics_sections', JSON.stringify(sections.value))
}

// Export functionality
function exportToCSV() {
  const csvRows: string[] = []
  
  // Header
  csvRows.push('Shanuzz Academy LMS - Analytics Report')
  csvRows.push(`Date Range: ${dateRangeLabel.value}`)
  csvRows.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
  csvRows.push('')
  
  // KPI Summary
  csvRows.push('KEY METRICS')
  csvRows.push('Metric,Value')
  csvRows.push(`Total Leads,${metrics.value.total}`)
  csvRows.push(`Pipeline Value,${formatCurrency(metrics.value.totalValue)}`)
  csvRows.push(`Won Deals,${metrics.value.byStatus.Won}`)
  csvRows.push(`Conversion Rate,${metrics.value.conversionRate}%`)
  csvRows.push('')
  
  // Pipeline Breakdown
  csvRows.push('PIPELINE BY STATUS')
  csvRows.push('Status,Count,Percentage')
  Object.entries(metrics.value.byStatus).forEach(([status, count]) => {
    const percentage = metrics.value.total > 0 ? ((count / metrics.value.total) * 100).toFixed(1) : '0'
    csvRows.push(`${status},${count},${percentage}%`)
  })
  csvRows.push('')
  
  // Temperature Distribution
  csvRows.push('LEAD TEMPERATURE')
  csvRows.push('Temperature,Count,Percentage')
  Object.entries(tempDistribution.value).forEach(([temp, count]) => {
    const percentage = metrics.value.total > 0 ? ((count / metrics.value.total) * 100).toFixed(1) : '0'
    csvRows.push(`${temp || 'Not Set'},${count},${percentage}%`)
  })
  csvRows.push('')
  
  // Agent Performance
  if (Object.keys(agentMetrics.value).length > 0) {
    csvRows.push('AGENT PERFORMANCE')
    csvRows.push('Agent Name,Assigned,Won,Lost,Win Rate,Pipeline Value')
    Object.entries(agentMetrics.value).forEach(([key, data]) => {
      csvRows.push(`${data.name},${data.assigned},${data.won},${data.lost},${data.winRate}%,${formatCurrency(data.pipelineValue)}`)
    })
  }
  
  // Create and download CSV
  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function refreshData() {
  // Emit refresh event or reload the page
  window.location.reload()
}

function getMonthStart(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function getTodayDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function applyDateRange(range: typeof dateRange.value) {
  dateRange.value = range
}

const dateRangeLabel = computed(() => {
  const presetLabels: Record<string, string> = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    'this-week': 'This Week',
    'last-week': 'Last Week',
    'this-month': 'This Month',
    'last-month': 'Last Month',
    'this-quarter': 'This Quarter',
    'this-year': 'This Year',
    'all-time': 'All Time',
    'custom': 'Custom'
  }
  return presetLabels[dateRange.value.preset] || 'This Month'
})

const filteredLeads = computed(() => {
  const startDate = new Date(dateRange.value.startDate)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(dateRange.value.endDate)
  endDate.setHours(23, 59, 59, 999)

  return props.leads.filter(lead => {
    const leadDate = new Date(lead.createdAt)
    return leadDate >= startDate && leadDate <= endDate
  })
})

// Comparison period leads (for delta calculations)
const comparisonLeads = computed(() => {
  if (!dateRange.value.compareMode) return []
  
  const start = new Date(dateRange.value.startDate)
  const end = new Date(dateRange.value.endDate)
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  const compStartDate = new Date(start)
  compStartDate.setDate(start.getDate() - duration - 1)
  compStartDate.setHours(0, 0, 0, 0)
  
  const compEndDate = new Date(start)
  compEndDate.setDate(start.getDate() - 1)
  compEndDate.setHours(23, 59, 59, 999)
  
  return props.leads.filter(lead => {
    const leadDate = new Date(lead.createdAt)
    return leadDate >= compStartDate && leadDate <= compEndDate
  })
})

const metrics = computed(() => calculatePipelineMetrics(filteredLeads.value))

const comparisonMetrics = computed(() => {
  if (!dateRange.value.compareMode || comparisonLeads.value.length === 0) {
    return null
  }
  return calculatePipelineMetrics(comparisonLeads.value)
})

// Calculate deltas for comparison
const metricDeltas = computed(() => {
  if (!comparisonMetrics.value) return null
  
  return {
    total: calculateDelta(metrics.value.total, comparisonMetrics.value.total),
    totalValue: calculateDelta(metrics.value.totalValue, comparisonMetrics.value.totalValue),
    won: calculateDelta(metrics.value.byStatus.Won, comparisonMetrics.value.byStatus.Won),
    conversionRate: calculateDelta(
      parseFloat(metrics.value.conversionRate), 
      parseFloat(comparisonMetrics.value.conversionRate)
    )
  }
})

function calculateDelta(current: number, previous: number): { value: number; percentage: number; direction: 'up' | 'down' | 'same' } {
  const diff = current - previous
  const percentage = previous > 0 ? (diff / previous) * 100 : 0
  return {
    value: diff,
    percentage: Math.abs(percentage),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  }
}

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

// Transition handlers for expand/collapse animation
function onEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = '0'
}

function onAfterEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = 'auto'
}

function onLeave(el: Element) {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  // Force reflow
  element.offsetHeight
  element.style.height = '0'
}

function onAfterLeave(el: Element) {
  const element = el as HTMLElement
  element.style.height = 'auto'
}

// Click outside handler for export menu
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (showExportMenu.value && !target.closest('.relative')) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
}
</style>
