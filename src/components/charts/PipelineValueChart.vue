<template>
  <div class="bg-white p-6 rounded-lg shadow border border-slate-200">
    <h3 class="text-lg font-bold text-slate-800 mb-4">Pipeline Value by Status</h3>
    <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    <div class="mt-4 text-center">
      <div class="text-2xl font-bold text-slate-800">{{ formatCurrency(totalValue) }}</div>
      <div class="text-sm text-slate-600">Total Pipeline Value</div>
    </div>
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
  const statusValues = {
    New: 0,
    Contacted: 0,
    Proposal: 0,
    Won: 0,
    Lost: 0
  }

  props.leads.forEach(lead => {
    if (lead.status && lead.status in statusValues) {
      statusValues[lead.status as keyof typeof statusValues] += lead.value || 0
    }
  })

  return {
    labels: ['New', 'Contacted', 'Proposal', 'Won', 'Lost'],
    datasets: [
      {
        label: 'Value (₹)',
        data: [
          statusValues.New,
          statusValues.Contacted,
          statusValues.Proposal,
          statusValues.Won,
          statusValues.Lost
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
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

const totalValue = computed(() => {
  return props.leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value)
}

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
          return formatCurrency(context.parsed.y)
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value: any) {
          return '₹' + (value / 1000).toFixed(0) + 'k'
        }
      }
    }
  }
}
</script>

<style scoped>
canvas {
  max-height: 280px;
}
</style>
