<template>
  <div class="h-full w-full overflow-auto bg-slate-50">
    <div class="p-3 md:p-6 space-y-4 md:space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ph-bold ph-chart-bar text-primary"></i>
          Analytics
        </h1>
        <div class="flex items-center gap-2">
          <button
            @click="showDatePicker = true"
            class="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border-2 border-slate-300 rounded-lg hover:border-slate-400 transition-colors text-sm font-semibold"
          >
            <i class="ph-bold ph-calendar text-lg text-slate-600"></i>
            <span class="hidden sm:inline text-slate-700">{{ dateRangeLabel }}</span>
          </button>
          <div class="relative">
            <button
              @click="showExportMenu = !showExportMenu"
              class="p-2 hover:bg-white border-2 border-transparent hover:border-slate-300 rounded-lg transition-colors"
              :class="showExportMenu ? 'bg-white border-slate-300' : ''"
            >
              <i class="ph-bold ph-dots-three-vertical text-xl text-slate-600"></i>
            </button>
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-if="showExportMenu" class="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button @click="exportToCSV(); showExportMenu = false" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <i class="ph-bold ph-file-csv text-lg text-green-600"></i>
                  <span>Export to CSV</span>
                </button>
                <button @click="refreshData(); showExportMenu = false" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <i class="ph-bold ph-arrow-clockwise text-lg text-blue-600"></i>
                  <span>Refresh Data</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <DateRangePicker
        :is-open="showDatePicker"
        :start-date="dateRange.startDate"
        :end-date="dateRange.endDate"
        :preset="dateRange.preset"
        :compare-mode="dateRange.compareMode"
        @close="showDatePicker = false"
        @apply="applyDateRange"
      />

      <!-- KPI Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div class="bg-blue-50 rounded-lg md:rounded-xl border-l-4 border-blue-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-blue-600 font-semibold uppercase tracking-wide">Leads</div>
          <div class="text-2xl md:text-3xl font-bold text-blue-900 mt-1">{{ metrics.total }}</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1" :class="metricDeltas.total.direction === 'up' ? 'text-green-600' : metricDeltas.total.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.total.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.total.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ Math.abs(metricDeltas.total.value) }} vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-blue-500 mt-1">Active in pipeline</div>
        </div>
        <div class="bg-green-50 rounded-lg md:rounded-xl border-l-4 border-green-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-green-600 font-semibold uppercase tracking-wide">Pipeline</div>
          <div class="text-xl md:text-2xl font-bold text-green-900 mt-1">{{ formatCurrency(metrics.totalValue).replace('₹', '₹').replace(',', 'L').substring(0, 6) }}</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1" :class="metricDeltas.totalValue.direction === 'up' ? 'text-green-600' : metricDeltas.totalValue.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.totalValue.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.totalValue.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ metricDeltas.totalValue.percentage.toFixed(0) }}% vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-green-500 mt-1">Total opportunity</div>
        </div>
        <div class="bg-emerald-50 rounded-lg md:rounded-xl border-l-4 border-emerald-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-emerald-600 font-semibold uppercase tracking-wide">Won</div>
          <div class="text-2xl md:text-3xl font-bold text-emerald-900 mt-1">{{ metrics.byStatus.Won }}</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1" :class="metricDeltas.won.direction === 'up' ? 'text-green-600' : metricDeltas.won.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.won.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.won.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ Math.abs(metricDeltas.won.value) }} vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-emerald-500 mt-1">{{ formatCurrency(metrics.wonValue) }}</div>
        </div>
        <div class="bg-purple-50 rounded-lg md:rounded-xl border-l-4 border-purple-500 p-3 md:p-4 hover:shadow-md transition">
          <div class="text-[10px] md:text-xs text-purple-600 font-semibold uppercase tracking-wide">Conv.</div>
          <div class="text-2xl md:text-3xl font-bold text-purple-900 mt-1">{{ metrics.conversionRate }}%</div>
          <div v-if="metricDeltas" class="text-[10px] md:text-xs mt-1 font-semibold flex items-center gap-1" :class="metricDeltas.conversionRate.direction === 'up' ? 'text-green-600' : metricDeltas.conversionRate.direction === 'down' ? 'text-red-600' : 'text-slate-500'">
            <i v-if="metricDeltas.conversionRate.direction === 'up'" class="ph-bold ph-arrow-up"></i>
            <i v-else-if="metricDeltas.conversionRate.direction === 'down'" class="ph-bold ph-arrow-down"></i>
            <i v-else class="ph-bold ph-minus"></i>
            <span>{{ metricDeltas.conversionRate.percentage.toFixed(1) }}% vs prev</span>
          </div>
          <div v-else class="text-[10px] md:text-xs text-purple-500 mt-1">Win to total ratio</div>
        </div>
      </div>

      <!-- #10 Overdue Follow-ups Alert (always visible) -->
      <div v-if="overdueLeads.length > 0" class="bg-red-50 rounded-xl border-l-4 border-red-500 p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="ph-bold ph-warning text-red-500 text-2xl shrink-0"></i>
          <div>
            <div class="font-bold text-red-800 text-sm">{{ overdueLeads.length }} Overdue Follow-up{{ overdueLeads.length !== 1 ? 's' : '' }}</div>
            <div class="text-xs text-red-600 mt-0.5">Active leads with missed follow-up dates</div>
          </div>
        </div>
        <span class="text-3xl font-black text-red-700 shrink-0 ml-4">{{ overdueLeads.length }}</span>
      </div>

      <!-- Pipeline & Temperature Section -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('pipeline')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.pipeline ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Pipeline Breakdown</span>
            <span class="text-xs text-slate-500">({{ metrics.total }} leads)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.pipeline ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.pipeline" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h2 class="text-base md:text-lg font-bold text-slate-800 mb-4">Pipeline by Status</h2>
                <div class="space-y-3">
                  <div v-for="(count, status) in metrics.byStatus" :key="status" class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full" :class="getStatusColor(status as keyof typeof metrics.byStatus)"></div>
                      <span class="text-sm font-medium text-slate-700">{{ status }}</span>
                    </div>
                    <div class="flex items-center gap-4">
                      <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full" :class="getStatusColor(status as keyof typeof metrics.byStatus)" :style="{ width: `${metrics.total > 0 ? (count / metrics.total) * 100 : 0}%` }"></div>
                      </div>
                      <span class="text-sm font-bold text-slate-700 w-8 text-right">{{ count }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 class="text-base md:text-lg font-bold text-slate-800 mb-4">Lead Temperature</h2>
                <div class="space-y-3">
                  <div v-for="(count, temp) in tempDistribution" :key="temp" class="flex items-center justify-between">
                    <span class="text-sm font-medium text-slate-700">{{ temp || 'Not Set' }}</span>
                    <div class="flex items-center gap-4">
                      <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full" :class="getTempColor(temp)" :style="{ width: `${metrics.total > 0 ? (count / metrics.total) * 100 : 0}%` }"></div>
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

      <!-- #1 Source ROI -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('sourceRoi')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.sourceRoi ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Source ROI</span>
            <span class="text-xs text-slate-500">({{ sourceRoiStats.length }} sources)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.sourceRoi ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.sourceRoi" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 overflow-x-auto">
              <div v-if="sourceRoiStats.length === 0" class="text-center py-8 text-slate-400">
                <i class="ph-bold ph-funnel text-4xl mb-2 block"></i>
                <p class="text-sm">No source data in this period</p>
              </div>
              <table v-else class="w-full text-sm">
                <thead>
                  <tr class="border-b-2 border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold bg-slate-50">
                    <th class="pb-3 px-3 text-left">Source</th>
                    <th class="pb-3 px-3 text-center">Leads</th>
                    <th class="pb-3 px-3 text-center">Won</th>
                    <th class="pb-3 px-3 text-center">Conv %</th>
                    <th class="pb-3 px-3 text-right hidden sm:table-cell">Avg Deal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="row in sourceRoiStats" :key="row.key" class="hover:bg-slate-50 transition">
                    <td class="py-3 px-3 font-semibold text-slate-800">{{ row.key }}</td>
                    <td class="py-3 px-3 text-center"><span class="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">{{ row.total }}</span></td>
                    <td class="py-3 px-3 text-center"><span class="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-xs">{{ row.won }}</span></td>
                    <td class="py-3 px-3">
                      <div class="flex items-center justify-center gap-2">
                        <div class="w-14 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full" :style="{ width: `${row.convRate}%`, backgroundColor: row.convRate >= 50 ? '#10b981' : row.convRate >= 25 ? '#f59e0b' : '#ef4444' }"></div>
                        </div>
                        <span class="font-bold text-xs w-8 text-right">{{ row.convRate }}%</span>
                      </div>
                    </td>
                    <td class="py-3 px-3 text-right font-bold text-slate-700 text-xs hidden sm:table-cell">{{ row.avgDealValue > 0 ? formatINR(row.avgDealValue) : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Agent Performance Section -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('agents')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.agents ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Agent Performance</span>
            <span class="text-xs text-slate-500">({{ Object.keys(agentMetrics).length }} agents)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.agents ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.agents" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0">
              <div v-if="Object.keys(agentMetrics).length > 0" class="md:hidden space-y-3">
                <div v-for="(agentData, key) in agentMetrics" :key="key" class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">{{ agentData.name?.charAt(0).toUpperCase() }}</span>
                      <span class="font-semibold text-slate-800">{{ agentData.name }}</span>
                    </div>
                    <span class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">{{ agentData.assigned }} leads</span>
                  </div>
                  <div class="grid grid-cols-3 gap-3 text-center mb-3">
                    <div><div class="text-xs text-slate-500 mb-1">Won</div><div class="text-lg font-bold text-green-600">{{ agentData.won }}</div></div>
                    <div><div class="text-xs text-slate-500 mb-1">Lost</div><div class="text-lg font-bold text-red-600">{{ agentData.lost }}</div></div>
                    <div><div class="text-xs text-slate-500 mb-1">Win Rate</div><div class="text-lg font-bold text-slate-800">{{ agentData.winRate }}%</div></div>
                  </div>
                  <div class="mb-3">
                    <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div class="h-full transition-all duration-300" :style="{ width: `${Math.min(100, agentData.winRate)}%`, backgroundColor: agentData.winRate >= 50 ? '#10b981' : agentData.winRate >= 25 ? '#f59e0b' : '#ef4444' }"></div>
                    </div>
                  </div>
                  <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span class="text-xs text-slate-500">Pipeline Value</span>
                    <span class="text-lg font-bold text-slate-800">{{ formatCurrency(agentData.pipelineValue) }}</span>
                  </div>
                </div>
              </div>
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
                          <span class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{{ agentData.name?.charAt(0).toUpperCase() }}</span>
                          {{ agentData.name }}
                        </div>
                      </td>
                      <td class="py-4 px-4 text-center"><span class="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">{{ agentData.assigned }}</span></td>
                      <td class="py-4 px-4 text-center"><span class="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 font-bold text-sm">{{ agentData.won }}</span></td>
                      <td class="py-4 px-4 text-center"><span class="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-sm">{{ agentData.lost }}</span></td>
                      <td class="py-4 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-full" :style="{ width: `${Math.min(100, agentData.winRate)}%`, backgroundColor: agentData.winRate >= 50 ? '#10b981' : agentData.winRate >= 25 ? '#f59e0b' : '#ef4444' }"></div>
                          </div>
                          <span class="font-bold text-sm w-10 text-right">{{ agentData.winRate }}%</span>
                        </div>
                      </td>
                      <td class="py-4 px-4 text-right font-bold text-slate-800">{{ formatCurrency(agentData.pipelineValue) }}</td>
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

      <!-- #3 + #10 Follow-up Analysis -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('followUps')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.followUps ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Follow-up Analysis</span>
            <span v-if="overdueLeads.length > 0" class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{{ overdueLeads.length }} overdue</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.followUps ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.followUps" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 space-y-6">

              <!-- Effectiveness comparison -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Follow-up Effectiveness</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                    <div class="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-1">With Follow-up Set</div>
                    <div class="text-3xl font-black text-emerald-800">{{ followUpEffectiveness.with.winRate }}%</div>
                    <div class="text-xs text-emerald-600 mt-1">win rate</div>
                    <div class="w-full h-1.5 bg-emerald-100 rounded-full mt-2 overflow-hidden">
                      <div class="h-full bg-emerald-500 rounded-full" :style="{ width: `${followUpEffectiveness.with.winRate}%` }"></div>
                    </div>
                    <div class="text-xs text-emerald-600 mt-2">{{ followUpEffectiveness.with.won }} won / {{ followUpEffectiveness.with.total }} leads</div>
                  </div>
                  <div class="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div class="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">Without Follow-up</div>
                    <div class="text-3xl font-black text-slate-700">{{ followUpEffectiveness.without.winRate }}%</div>
                    <div class="text-xs text-slate-500 mt-1">win rate</div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div class="h-full bg-slate-400 rounded-full" :style="{ width: `${followUpEffectiveness.without.winRate}%` }"></div>
                    </div>
                    <div class="text-xs text-slate-500 mt-2">{{ followUpEffectiveness.without.won }} won / {{ followUpEffectiveness.without.total }} leads</div>
                  </div>
                </div>
              </div>

              <!-- Overdue by agent -->
              <div v-if="overdueLeads.length > 0">
                <h3 class="text-sm font-bold text-slate-700 mb-3">Overdue by Agent</h3>
                <div class="space-y-2">
                  <div v-for="row in overdueByAgent" :key="row.agent" class="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                    <span class="text-sm font-medium text-slate-800">{{ row.agent }}</span>
                    <span class="text-sm font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{{ row.count }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-slate-400 text-sm">No overdue follow-ups in this period</div>

            </div>
          </div>
        </Transition>
      </div>

      <!-- #6 + #7 Course & Location -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('courseLocation')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.courseLocation ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Course & Location</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.courseLocation ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.courseLocation" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 space-y-6">

              <!-- Course popularity — two panels -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Course / Interest</h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Volume</div>
                    <div class="space-y-2">
                      <div v-for="row in interestByVolume" :key="row.key" class="flex items-center justify-between gap-3">
                        <span class="text-sm text-slate-700 truncate flex-1">{{ row.key }}</span>
                        <div class="flex items-center gap-2 shrink-0">
                          <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-400 rounded-full" :style="{ width: `${interestByVolume[0] ? (row.total / interestByVolume[0].total) * 100 : 0}%` }"></div>
                          </div>
                          <span class="text-xs font-bold text-slate-600 w-6 text-right">{{ row.total }}</span>
                        </div>
                      </div>
                      <div v-if="interestByVolume.length === 0" class="text-xs text-slate-400 py-2">No interest data</div>
                    </div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Conversion</div>
                    <div class="space-y-2">
                      <div v-for="row in interestByConversion" :key="row.key" class="flex items-center justify-between gap-3">
                        <span class="text-sm text-slate-700 truncate flex-1">{{ row.key }}</span>
                        <div class="flex items-center gap-2 shrink-0">
                          <div class="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-400 rounded-full" :style="{ width: `${row.convRate}%` }"></div>
                          </div>
                          <span class="text-xs font-bold text-slate-600 w-8 text-right">{{ row.convRate }}%</span>
                        </div>
                      </div>
                      <div v-if="interestByConversion.length === 0" class="text-xs text-slate-400 py-2">Not enough data</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Location table -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Location Breakdown</h3>
                <div v-if="locationStats.length === 0" class="text-center py-4 text-slate-400 text-sm">No location data</div>
                <div v-else class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b-2 border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold bg-slate-50">
                        <th class="pb-2 px-3 text-left">City</th>
                        <th class="pb-2 px-3 text-center">Leads</th>
                        <th class="pb-2 px-3 text-center">Won</th>
                        <th class="pb-2 px-3 text-center">Conv %</th>
                        <th class="pb-2 px-3 text-right hidden sm:table-cell">Pipeline</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="row in locationStats" :key="row.key" class="hover:bg-slate-50 transition">
                        <td class="py-2 px-3 font-semibold text-slate-800">{{ row.key }}</td>
                        <td class="py-2 px-3 text-center text-xs font-bold text-blue-700">{{ row.total }}</td>
                        <td class="py-2 px-3 text-center text-xs font-bold text-green-700">{{ row.won }}</td>
                        <td class="py-2 px-3 text-center text-xs font-bold" :class="row.convRate >= 50 ? 'text-emerald-600' : row.convRate >= 25 ? 'text-amber-600' : 'text-slate-500'">{{ row.convRate }}%</td>
                        <td class="py-2 px-3 text-right text-xs font-bold text-slate-700 hidden sm:table-cell">{{ formatINR(row.totalValue) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </Transition>
      </div>

      <!-- #4 + #5 Lead Demographics -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('demographics')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.demographics ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Lead Demographics</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.demographics ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.demographics" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-6">

              <!-- Age distribution -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Age Distribution</h3>
                <div v-if="!hasAgeData" class="text-center py-6 text-slate-400">
                  <i class="ph-bold ph-user text-3xl mb-2 block"></i>
                  <p class="text-sm">No age data collected yet</p>
                </div>
                <div v-else class="space-y-3">
                  <div v-for="bucket in ageDistribution" :key="bucket.label" class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-semibold text-slate-700">{{ bucket.label }}</span>
                      <span class="text-slate-500">{{ bucket.total }} leads · {{ bucket.winRate }}% won</span>
                    </div>
                    <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                      <div class="absolute inset-y-0 left-0 bg-indigo-200 rounded-full" :style="{ width: `${ageDistribution[0] ? (bucket.total / Math.max(...ageDistribution.map(b => b.total))) * 100 : 0}%` }"></div>
                      <div class="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" :style="{ width: `${ageDistribution[0] ? (bucket.won / Math.max(...ageDistribution.map(b => b.total))) * 100 : 0}%` }"></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 pt-1 text-xs text-slate-500">
                    <span class="flex items-center gap-1"><span class="w-3 h-2 rounded bg-indigo-200 inline-block"></span> Total</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-2 rounded bg-emerald-500 inline-block"></span> Won</span>
                  </div>
                </div>
              </div>

              <!-- Prior experience -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Prior Experience</h3>
                <div v-if="priorExperienceStats.length === 0 || (priorExperienceStats.length === 1 && priorExperienceStats[0].key === 'Not specified')" class="text-center py-6 text-slate-400">
                  <i class="ph-bold ph-briefcase text-3xl mb-2 block"></i>
                  <p class="text-sm">No experience data collected yet</p>
                </div>
                <div v-else class="space-y-2">
                  <div v-for="row in priorExperienceStats" :key="row.key" class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition">
                    <span class="text-sm text-slate-700 font-medium">{{ row.key }}</span>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-slate-500">{{ row.total }} leads</span>
                      <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="row.convRate >= 50 ? 'bg-emerald-100 text-emerald-700' : row.convRate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'">{{ row.convRate }}%</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Transition>
      </div>

      <!-- #2 Lost Reasons -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('lostReasons')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.lostReasons ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Lost Reasons</span>
            <span class="text-xs text-slate-500">({{ lostLeads.length }} lost)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.lostReasons ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.lostReasons" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0">
              <div v-if="lostLeads.length === 0" class="text-center py-8 text-slate-400">
                <i class="ph-bold ph-smiley text-4xl mb-2 block"></i>
                <p class="text-sm">No lost leads in this period</p>
              </div>
              <div v-else>
                <!-- Tab toggle -->
                <div class="flex gap-2 mb-4">
                  <button @click="lostView = 'reason'" :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition', lostView === 'reason' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">By Reason</button>
                  <button @click="lostView = 'type'" :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition', lostView === 'type' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">By Category</button>
                </div>
                <!-- By Reason -->
                <div v-if="lostView === 'reason'" class="space-y-3">
                  <div v-for="row in lostReasonStats" :key="row.reason" class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium text-slate-700 truncate mr-2">{{ row.reason }}</span>
                      <span class="text-slate-500 shrink-0">{{ row.count }} · {{ row.pct }}%</span>
                    </div>
                    <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-red-400 rounded-full transition-all duration-500" :style="{ width: `${row.pct}%` }"></div>
                    </div>
                  </div>
                </div>
                <!-- By Category -->
                <div v-else class="space-y-3">
                  <div v-for="row in lostReasonTypeStats" :key="row.type" class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium text-slate-700">{{ row.type }}</span>
                      <span class="text-slate-500">{{ row.count }} · {{ row.pct }}%</span>
                    </div>
                    <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-orange-400 rounded-full transition-all duration-500" :style="{ width: `${row.pct}%` }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- #8 + #9 Trend Analysis -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('velocity')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.velocity ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Trend Analysis</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.velocity ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
          <div v-if="sections.velocity" class="overflow-hidden">
            <div class="p-4 md:p-6 pt-0 space-y-6">

              <!-- Lead Velocity -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-3">Lead Velocity</h3>
                <div v-if="leadVelocity.length === 0" class="text-center py-6 text-slate-400 text-sm">No data for this period</div>
                <SimpleBarChart v-else :items="leadVelocity" color="#6366f1" />
              </div>

              <!-- Time to Convert -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 mb-1">Time to Convert</h3>
                <div v-if="timeToConvert.avgOverall === null" class="text-center py-6 text-slate-400 text-sm">No Won deals in this period</div>
                <div v-else class="space-y-4">
                  <!-- Overall KPI -->
                  <div class="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div class="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Avg Days to Close</div>
                      <div class="text-xs text-indigo-500 mt-0.5">based on {{ timeToConvert.totalWon }} won deal{{ timeToConvert.totalWon !== 1 ? 's' : '' }}</div>
                    </div>
                    <div class="text-4xl font-black text-indigo-800">{{ timeToConvert.avgOverall }}<span class="text-lg font-semibold ml-1">d</span></div>
                  </div>
                  <!-- By Agent and By Source -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="timeToConvert.byAgent.length > 0">
                      <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Agent (fastest first)</div>
                      <div class="space-y-2">
                        <div v-for="row in timeToConvert.byAgent" :key="row.agent" class="flex items-center gap-2">
                          <span class="text-xs text-slate-700 w-24 truncate shrink-0">{{ row.agent }}</span>
                          <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full" :style="{ width: `${timeToConvert.maxDays > 0 ? ((timeToConvert.maxDays - row.avgDays) / timeToConvert.maxDays) * 100 : 0}%`, backgroundColor: row.avgDays <= 7 ? '#10b981' : row.avgDays <= 21 ? '#f59e0b' : '#ef4444' }"></div>
                          </div>
                          <span class="text-xs font-bold text-slate-600 shrink-0 w-10 text-right">{{ row.avgDays }}d</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="timeToConvert.bySource.length > 0">
                      <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Source (fastest first)</div>
                      <div class="space-y-2">
                        <div v-for="row in timeToConvert.bySource" :key="row.source" class="flex items-center gap-2">
                          <span class="text-xs text-slate-700 w-24 truncate shrink-0">{{ row.source }}</span>
                          <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full" :style="{ width: `${timeToConvert.maxDays > 0 ? ((timeToConvert.maxDays - row.avgDays) / timeToConvert.maxDays) * 100 : 0}%`, backgroundColor: row.avgDays <= 7 ? '#10b981' : row.avgDays <= 21 ? '#f59e0b' : '#ef4444' }"></div>
                          </div>
                          <span class="text-xs font-bold text-slate-600 shrink-0 w-10 text-right">{{ row.avgDays }}d</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Transition>
      </div>

      <!-- Charts & Visualizations -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
        <button @click="toggleSection('charts')" class="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl">
          <div class="flex items-center gap-3">
            <i :class="sections.charts ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'" class="text-slate-600 text-lg"></i>
            <span class="font-bold text-slate-800 text-sm md:text-base">Charts & Visualizations</span>
            <span class="text-xs text-slate-500">(3 charts)</span>
          </div>
          <span class="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{{ sections.charts ? 'Collapse' : 'Expand' }}</span>
        </button>
        <Transition name="expand" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
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
import { useAnalyticsUtils } from '@/composables/useAnalyticsUtils'
import { useFollowUpTracking } from '@/composables/useFollowUpTracking'
import DateRangePicker from '@/components/DateRangePicker.vue'
import ConversionFunnelChart from '@/components/charts/ConversionFunnelChart.vue'
import PipelineValueChart from '@/components/charts/PipelineValueChart.vue'
import LeadSourceChart from '@/components/charts/LeadSourceChart.vue'
import SimpleBarChart from '@/components/charts/SimpleBarChart.vue'

const props = defineProps<{
  leads: Lead[]
  users?: User[]
}>()

const { formatCurrency, calculatePipelineMetrics } = useLeadScoring()
const { safePercent, groupByField, weekStartISO, formatINR } = useAnalyticsUtils()
const { isFollowUpOverdue, getFollowUpDate } = useFollowUpTracking()

const showDatePicker = ref(false)
const showExportMenu = ref(false)
const dateRange = ref({
  startDate: getMonthStart(),
  endDate: getTodayDate(),
  preset: 'this-month',
  compareMode: false
})

const isMobile = ref(window.innerWidth < 768)
const sections = ref({
  pipeline: !isMobile.value,
  agents: !isMobile.value,
  charts: !isMobile.value,
  sourceRoi: !isMobile.value,
  lostReasons: !isMobile.value,
  followUps: !isMobile.value,
  demographics: !isMobile.value,
  courseLocation: !isMobile.value,
  velocity: !isMobile.value
})

const savedSections = localStorage.getItem('analytics_sections')
if (savedSections) {
  try {
    const parsed = JSON.parse(savedSections)
    sections.value = { ...sections.value, ...parsed }
  } catch (e) {}
}

function toggleSection(section: keyof typeof sections.value) {
  sections.value[section] = !sections.value[section]
  localStorage.setItem('analytics_sections', JSON.stringify(sections.value))
}

// Tab state for lost reasons
const lostView = ref<'reason' | 'type'>('reason')

// ─── Date helpers ───────────────────────────────────────────────
function getMonthStart(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function getTodayDate(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function applyDateRange(range: typeof dateRange.value) {
  dateRange.value = range
}

const dateRangeLabel = computed(() => {
  const labels: Record<string, string> = {
    'today': 'Today', 'yesterday': 'Yesterday', 'this-week': 'This Week',
    'last-week': 'Last Week', 'this-month': 'This Month', 'last-month': 'Last Month',
    'this-quarter': 'This Quarter', 'this-year': 'This Year', 'all-time': 'All Time', 'custom': 'Custom'
  }
  return labels[dateRange.value.preset] || 'This Month'
})

// ─── Filtered leads ──────────────────────────────────────────────
const filteredLeads = computed(() => {
  const start = new Date(dateRange.value.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dateRange.value.endDate)
  end.setHours(23, 59, 59, 999)
  return props.leads.filter(l => {
    const d = new Date(l.createdAt)
    return d >= start && d <= end
  })
})

const comparisonLeads = computed(() => {
  if (!dateRange.value.compareMode) return []
  const start = new Date(dateRange.value.startDate)
  const end = new Date(dateRange.value.endDate)
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const compStart = new Date(start)
  compStart.setDate(start.getDate() - duration - 1)
  compStart.setHours(0, 0, 0, 0)
  const compEnd = new Date(start)
  compEnd.setDate(start.getDate() - 1)
  compEnd.setHours(23, 59, 59, 999)
  return props.leads.filter(l => {
    const d = new Date(l.createdAt)
    return d >= compStart && d <= compEnd
  })
})

// ─── Core metrics ────────────────────────────────────────────────
const metrics = computed(() => calculatePipelineMetrics(filteredLeads.value))
const comparisonMetrics = computed(() => {
  if (!dateRange.value.compareMode || comparisonLeads.value.length === 0) return null
  return calculatePipelineMetrics(comparisonLeads.value)
})

const metricDeltas = computed(() => {
  if (!comparisonMetrics.value) return null
  return {
    total: calculateDelta(metrics.value.total, comparisonMetrics.value.total),
    totalValue: calculateDelta(metrics.value.totalValue, comparisonMetrics.value.totalValue),
    won: calculateDelta(metrics.value.byStatus.Won, comparisonMetrics.value.byStatus.Won),
    conversionRate: calculateDelta(parseFloat(metrics.value.conversionRate as any), parseFloat(comparisonMetrics.value.conversionRate as any))
  }
})

function calculateDelta(current: number, previous: number) {
  const diff = current - previous
  const percentage = previous > 0 ? (diff / previous) * 100 : 0
  return { value: diff, percentage: Math.abs(percentage), direction: diff > 0 ? 'up' as const : diff < 0 ? 'down' as const : 'same' as const }
}

const tempDistribution = computed(() => {
  const dist: Record<string, number> = { Hot: 0, Warm: 0, Cold: 0, 'Not Set': 0 }
  filteredLeads.value.forEach(l => {
    const temp = l.temperature || 'Not Set'
    if (temp in dist) dist[temp]++
    else dist['Not Set']++
  })
  return dist
})

const agentMetrics = computed(() => {
  const agents: Record<string, any> = {}
  if (props.users) {
    props.users.forEach(user => {
      const key = user.username || user.id
      const assigned = filteredLeads.value.filter(l => l.assignedTo === key)
      const won = assigned.filter(l => l.status === 'Won').length
      const lost = assigned.filter(l => l.status === 'Lost').length
      const pipelineValue = assigned.reduce((s, l) => s + (l.value || 0), 0)
      agents[key] = { name: user.name, assigned: assigned.length, won, lost, winRate: assigned.length > 0 ? Math.round((won / assigned.length) * 100) : 0, pipelineValue }
    })
  }
  return agents
})

// ─── #1 Source ROI ───────────────────────────────────────────────
const sourceRoiStats = computed(() =>
  groupByField(filteredLeads.value, l => l.source || 'Unknown').sort((a, b) => b.convRate - a.convRate)
)

// ─── #2 Lost Reasons ─────────────────────────────────────────────
const LOST_TYPE_LABELS: Record<string, string> = {
  price: 'Price', not_interested: 'Not Interested', competitor: 'Competitor',
  invalid_number: 'Invalid Number', duplicate: 'Duplicate', other: 'Other'
}

const lostLeads = computed(() => filteredLeads.value.filter(l => l.status === 'Lost'))

const lostReasonStats = computed(() => {
  const map: Record<string, number> = {}
  lostLeads.value.forEach(l => { const k = l.lostReason || 'Not specified'; map[k] = (map[k] || 0) + 1 })
  const total = lostLeads.value.length
  return Object.entries(map).map(([reason, count]) => ({ reason, count, pct: safePercent(count, total) })).sort((a, b) => b.count - a.count)
})

const lostReasonTypeStats = computed(() => {
  const map: Record<string, number> = {}
  lostLeads.value.forEach(l => {
    const k = l.lostReasonType ? (LOST_TYPE_LABELS[l.lostReasonType] || l.lostReasonType) : 'Not categorized'
    map[k] = (map[k] || 0) + 1
  })
  const total = lostLeads.value.length
  return Object.entries(map).map(([type, count]) => ({ type, count, pct: safePercent(count, total) })).sort((a, b) => b.count - a.count)
})

// ─── #3 Follow-up Effectiveness ──────────────────────────────────
const followUpEffectiveness = computed(() => {
  const withFU = filteredLeads.value.filter(l => !!getFollowUpDate(l))
  const withoutFU = filteredLeads.value.filter(l => !getFollowUpDate(l))
  const wonWith = withFU.filter(l => l.status === 'Won').length
  const wonWithout = withoutFU.filter(l => l.status === 'Won').length
  return {
    with: { total: withFU.length, won: wonWith, winRate: safePercent(wonWith, withFU.length) },
    without: { total: withoutFU.length, won: wonWithout, winRate: safePercent(wonWithout, withoutFU.length) }
  }
})

// ─── #10 Overdue Follow-ups ──────────────────────────────────────
const overdueLeads = computed(() =>
  filteredLeads.value.filter(l => !['Won', 'Lost'].includes(l.status) && isFollowUpOverdue(l))
)

const overdueByAgent = computed(() => {
  const map: Record<string, number> = {}
  overdueLeads.value.forEach(l => { const k = l.assignedTo || 'Unassigned'; map[k] = (map[k] || 0) + 1 })
  return Object.entries(map).map(([agent, count]) => ({ agent, count })).sort((a, b) => b.count - a.count)
})

// ─── #4 Age Distribution ─────────────────────────────────────────
const AGE_BUCKETS = [
  { label: '<18', min: 0, max: 17 },
  { label: '18–24', min: 18, max: 24 },
  { label: '25–30', min: 25, max: 30 },
  { label: '31–35', min: 31, max: 35 },
  { label: '36–40', min: 36, max: 40 },
  { label: '40+', min: 41, max: Infinity }
]

const hasAgeData = computed(() => filteredLeads.value.some(l => l.age !== undefined))

const ageDistribution = computed(() =>
  AGE_BUCKETS.map(b => {
    const leads = filteredLeads.value.filter(l => l.age !== undefined && l.age >= b.min && l.age <= b.max)
    const won = leads.filter(l => l.status === 'Won').length
    return { ...b, total: leads.length, won, winRate: safePercent(won, leads.length) }
  }).filter(b => b.total > 0)
)

// ─── #5 Prior Experience ─────────────────────────────────────────
const priorExperienceStats = computed(() =>
  groupByField(filteredLeads.value, l => l.priorExperience || 'Not specified').sort((a, b) => b.total - a.total)
)

// ─── #6 Interest / Course ────────────────────────────────────────
const allInterestStats = computed(() => groupByField(filteredLeads.value, l => l.interest || 'Not specified'))
const interestByVolume = computed(() => [...allInterestStats.value].sort((a, b) => b.total - a.total).slice(0, 8))
const interestByConversion = computed(() => [...allInterestStats.value].filter(r => r.total >= 2).sort((a, b) => b.convRate - a.convRate).slice(0, 8))

// ─── #7 Location ─────────────────────────────────────────────────
const locationStats = computed(() =>
  groupByField(filteredLeads.value, l => l.location || 'Unknown').sort((a, b) => b.total - a.total)
)

// ─── #8 Lead Velocity ────────────────────────────────────────────
const leadVelocity = computed(() => {
  const start = new Date(dateRange.value.startDate)
  const end = new Date(dateRange.value.endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const useWeekly = daysDiff > 14
  const buckets = new Map<string, number>()
  filteredLeads.value.forEach(l => {
    const d = new Date(l.createdAt)
    const key = useWeekly ? weekStartISO(d) : d.toISOString().split('T')[0]
    buckets.set(key, (buckets.get(key) || 0) + 1)
  })
  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      label: useWeekly
        ? `W${date.slice(5, 10)}`
        : new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      value: count
    }))
})

// ─── #9 Time to Convert ──────────────────────────────────────────
const timeToConvert = computed(() => {
  const wonLeads = filteredLeads.value.filter(l => l.status === 'Won')

  function getDays(lead: Lead): number | null {
    const wonAct = lead.activities?.find(a => a.type === 'status_change' && a.note?.toLowerCase().includes('won'))
    const wonDate = wonAct?.timestamp || lead.updatedAt
    if (!wonDate || !lead.createdAt) return null
    return Math.max(0, Math.round((new Date(wonDate).getTime() - new Date(lead.createdAt).getTime()) / 86400000))
  }

  const withDays = wonLeads.map(l => ({ lead: l, days: getDays(l) })).filter((x): x is { lead: Lead; days: number } => x.days !== null)

  const avgOverall = withDays.length > 0 ? Math.round(withDays.reduce((s, x) => s + x.days, 0) / withDays.length) : null

  const agentMap: Record<string, number[]> = {}
  withDays.forEach(({ lead, days }) => { const k = lead.assignedTo || 'Unassigned'; (agentMap[k] = agentMap[k] || []).push(days) })
  const byAgent = Object.entries(agentMap).map(([agent, arr]) => ({ agent, avgDays: Math.round(arr.reduce((s, d) => s + d, 0) / arr.length), count: arr.length })).sort((a, b) => a.avgDays - b.avgDays)

  const sourceMap: Record<string, number[]> = {}
  withDays.forEach(({ lead, days }) => { const k = lead.source || 'Unknown'; (sourceMap[k] = sourceMap[k] || []).push(days) })
  const bySource = Object.entries(sourceMap).map(([source, arr]) => ({ source, avgDays: Math.round(arr.reduce((s, d) => s + d, 0) / arr.length), count: arr.length })).sort((a, b) => a.avgDays - b.avgDays)

  const maxDays = Math.max(...byAgent.map(r => r.avgDays), ...bySource.map(r => r.avgDays), 1)

  return { avgOverall, byAgent, bySource, totalWon: wonLeads.length, maxDays }
})

// ─── Colour helpers ───────────────────────────────────────────────
function getStatusColor(status: string): string {
  const c: Record<string, string> = { New: 'bg-blue-500', Contacted: 'bg-yellow-500', Proposal: 'bg-purple-500', Won: 'bg-green-500', Lost: 'bg-red-500' }
  return c[status] || 'bg-slate-500'
}

function getTempColor(temp: string): string {
  const c: Record<string, string> = { Hot: 'bg-red-500', Warm: 'bg-amber-500', Cold: 'bg-blue-500', 'Not Set': 'bg-slate-300' }
  return c[temp] || 'bg-slate-300'
}

// ─── Expand/collapse animation ────────────────────────────────────
function onEnter(el: Element) { (el as HTMLElement).style.height = '0' }
function onAfterEnter(el: Element) { (el as HTMLElement).style.height = 'auto' }
function onLeave(el: Element) {
  const e = el as HTMLElement
  e.style.height = `${e.scrollHeight}px`
  e.offsetHeight
  e.style.height = '0'
}
function onAfterLeave(el: Element) { (el as HTMLElement).style.height = 'auto' }

// ─── Click outside for export menu ───────────────────────────────
function handleClickOutside(event: MouseEvent) {
  if (showExportMenu.value && !(event.target as HTMLElement).closest('.relative')) showExportMenu.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// ─── Refresh ─────────────────────────────────────────────────────
function refreshData() { window.location.reload() }

// ─── CSV Export ──────────────────────────────────────────────────
function exportToCSV() {
  const rows: string[] = []
  rows.push('Shanuzz Academy LMS - Analytics Report')
  rows.push(`Date Range: ${dateRangeLabel.value}`)
  rows.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
  rows.push('')
  rows.push('KEY METRICS')
  rows.push('Metric,Value')
  rows.push(`Total Leads,${metrics.value.total}`)
  rows.push(`Pipeline Value,${formatCurrency(metrics.value.totalValue)}`)
  rows.push(`Won Deals,${metrics.value.byStatus.Won}`)
  rows.push(`Conversion Rate,${metrics.value.conversionRate}%`)
  rows.push(`Overdue Follow-ups,${overdueLeads.value.length}`)
  if (timeToConvert.value.avgOverall !== null) rows.push(`Avg Days to Convert,${timeToConvert.value.avgOverall}`)
  rows.push('')
  rows.push('SOURCE ROI')
  rows.push('Source,Leads,Won,Conv%,Avg Deal')
  sourceRoiStats.value.forEach(r => rows.push(`${r.key},${r.total},${r.won},${r.convRate}%,${r.avgDealValue > 0 ? formatINR(r.avgDealValue) : ''}`))
  rows.push('')
  rows.push('LOST REASONS')
  rows.push('Reason,Count,Pct')
  lostReasonStats.value.forEach(r => rows.push(`${r.reason},${r.count},${r.pct}%`))
  rows.push('')
  rows.push('AGENT PERFORMANCE')
  rows.push('Agent,Assigned,Won,Lost,Win Rate,Pipeline Value')
  Object.entries(agentMetrics.value).forEach(([, d]: [string, any]) => rows.push(`${d.name},${d.assigned},${d.won},${d.lost},${d.winRate}%,${formatCurrency(d.pipelineValue)}`))
  const csv = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
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
