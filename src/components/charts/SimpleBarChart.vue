<template>
  <div class="w-full overflow-x-auto">
    <svg
      :viewBox="`0 0 ${totalWidth} ${height + labelHeight}`"
      :style="{ minWidth: `${Math.max(items.length * 40, 200)}px` }"
      class="w-full"
    >
      <g v-for="(item, i) in items" :key="i">
        <rect
          :x="i * barStep + barPad"
          :y="height - barH(item.value)"
          :width="barW"
          :height="barH(item.value)"
          :fill="color || '#6366f1'"
          rx="3"
        />
        <text
          v-if="item.value > 0"
          :x="i * barStep + barPad + barW / 2"
          :y="height - barH(item.value) - 4"
          text-anchor="middle"
          font-size="10"
          fill="#64748b"
          font-weight="600"
        >{{ item.value }}</text>
        <text
          :x="i * barStep + barPad + barW / 2"
          :y="height + 14"
          text-anchor="end"
          font-size="9"
          fill="#94a3b8"
          :transform="`rotate(-35, ${i * barStep + barPad + barW / 2}, ${height + 14})`"
        >{{ item.label }}</text>
      </g>
      <line :x1="0" :y1="height" :x2="totalWidth" :y2="height" stroke="#e2e8f0" stroke-width="1" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  items: { label: string; value: number }[]
  color?: string
}>()

const height = 140
const labelHeight = 44
const barPad = 6
const barStep = computed(() => Math.max(600 / Math.max(props.items.length, 1), 40))
const barW = computed(() => Math.max(barStep.value - barPad * 2, 8))
const totalWidth = computed(() => props.items.length * barStep.value)
const maxVal = computed(() => Math.max(...props.items.map(i => i.value), 1))

function barH(value: number): number {
  return Math.max((value / maxVal.value) * height * 0.85, value > 0 ? 4 : 0)
}
</script>
