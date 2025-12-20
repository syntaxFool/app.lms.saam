<template>
  <div class="bg-white p-6 rounded-lg shadow border border-slate-200">
    <h3 class="text-lg font-bold text-slate-800 mb-4">Conversion Funnel</h3>
    <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import type { Lead } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  leads: Lead[]
}

const props = defineProps<Props>()

const chartData = computed(() => {
  const statusCounts = {
    New: 0,
    Contacted: 0,
    Proposal: 0,
    Won: 0,
    Lost: 0
  }

  props.leads.forEach(lead => {
    if (lead.status && lead.status in statusCounts) {
      statusCounts[lead.status as keyof typeof statusCounts]++
    }
  })

  return {
    labels: ['New', 'Contacted', 'Proposal', 'Won', 'Lost'],
    datasets: [
      {
        label: 'Number of Leads',
        data: [
          statusCounts.New,
          statusCounts.Contacted,
          statusCounts.Proposal,
          statusCounts.Won,
          statusCounts.Lost
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue for New
          'rgba(234, 179, 8, 0.8)',     // Yellow for Contacted
          'rgba(168, 85, 247, 0.8)',    // Purple for Proposal
          'rgba(34, 197, 94, 0.8)',     // Green for Won
          'rgba(239, 68, 68, 0.8)'      // Red for Lost
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(234, 179, 8)',
          'rgb(168, 85, 247)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const total = props.leads.length
          const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0
          return `${context.parsed.y} leads (${percentage}%)`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    }
  }
}
</script>

<style scoped>
canvas {
  max-height: 300px;
}
</style>
