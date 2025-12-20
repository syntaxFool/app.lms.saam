<template>
  <div class="bg-white p-6 rounded-lg shadow border border-slate-200">
    <h3 class="text-lg font-bold text-slate-800 mb-4">Leads by Source</h3>
    <div class="flex flex-col lg:flex-row items-center gap-6">
      <div class="w-full lg:w-1/2">
        <Doughnut v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
      <div class="w-full lg:w-1/2 space-y-2">
        <div v-for="(source, index) in topSources" :key="source.name" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: colors[index] }"></div>
            <span class="text-sm font-medium text-slate-700">{{ source.name || 'Unknown' }}</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-bold text-slate-800">{{ source.count }}</div>
            <div class="text-xs text-slate-500">{{ source.percentage }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { Lead } from '@/types'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  leads: Lead[]
}

const props = defineProps<Props>()

const colors = [
  'rgb(59, 130, 246)',    // Blue
  'rgb(234, 179, 8)',     // Yellow
  'rgb(168, 85, 247)',    // Purple
  'rgb(34, 197, 94)',     // Green
  'rgb(239, 68, 68)',     // Red
  'rgb(249, 115, 22)',    // Orange
  'rgb(20, 184, 166)',    // Teal
  'rgb(236, 72, 153)'     // Pink
]

const topSources = computed(() => {
  const sourceCounts: Record<string, number> = {}
  
  props.leads.forEach(lead => {
    const source = lead.source || 'Unknown'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })

  const total = props.leads.length

  return Object.entries(sourceCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

const chartData = computed(() => {
  return {
    labels: topSources.value.map(s => s.name),
    datasets: [
      {
        data: topSources.value.map(s => s.count),
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const total = props.leads.length
          const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0
          return `${context.label}: ${context.parsed} (${percentage}%)`
        }
      }
    }
  }
}
</script>

<style scoped>
canvas {
  max-width: 280px;
  max-height: 280px;
}
</style>
