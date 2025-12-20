<template>
  <div class="w-full bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
    <!-- Header with Actions -->
    <div v-if="showHeader" class="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
      <div>
        <h3 v-if="title" class="text-lg font-bold text-slate-900">{{ title }}</h3>
        <p v-if="subtitle" class="text-sm text-slate-600 mt-1">{{ subtitle }}</p>
      </div>
      <div class="flex gap-3">
        <slot name="header-actions" />
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto flex-1">
      <table class="w-full text-sm">
        <thead class="bg-slate-100 border-b border-slate-200">
          <tr>
            <!-- Checkbox Column -->
            <th v-if="selectable" class="px-6 py-3 text-left w-12">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
            </th>
            <!-- Data Columns -->
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-6 py-3 text-left font-semibold text-slate-700 whitespace-nowrap"
              :style="column.width ? { width: column.width } : {}"
            >
              <div class="flex items-center gap-2">
                {{ column.label }}
                <i
                  v-if="sortKey === column.key"
                  :class="[
                    'ph-bold text-xs',
                    sortOrder === 'asc' ? 'ph-arrow-up' : 'ph-arrow-down'
                  ]"
                ></i>
              </div>
            </th>
            <!-- Actions Column -->
            <th v-if="hasActions" class="px-6 py-3 text-right font-semibold text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayedRows"
            :key="`${rowKey}-${getRowKey(row)}`"
            class="border-b border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <!-- Checkbox Column -->
            <td v-if="selectable" class="px-6 py-4 w-12">
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change="toggleRow(row)"
                class="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
            </td>
            <!-- Data Columns -->
            <td
              v-for="column in columns"
              :key="`${getRowKey(row)}-${column.key}`"
              class="px-6 py-4"
            >
              <slot :name="`cell-${column.key}`" :value="getNestedValue(row, column.key)" :row="row">
                <span class="text-slate-700">{{ formatValue(getNestedValue(row, column.key), column) }}</span>
              </slot>
            </td>
            <!-- Actions Column -->
            <td v-if="hasActions" class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <slot name="row-actions" :row="row" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="displayedRows.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
        <i class="ph-duotone ph-ghost text-4xl mb-3 opacity-60"></i>
        <p class="text-sm">{{ emptyMessage }}</p>
      </div>
    </div>

    <!-- Footer with Pagination -->
    <div v-if="showPagination && totalPages > 1" class="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
      <div class="text-sm text-slate-600">
        Showing {{ startRecord }} to {{ endRecord }} of {{ totalRecords }}
      </div>
      <div class="flex gap-2">
        <button
          @click="previousPage"
          :disabled="currentPage === 1"
          class="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <i class="ph-bold ph-arrow-left"></i>
        </button>
        <div class="flex items-center gap-1">
          <button
            v-for="page in pageNumbers"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-3 py-2 rounded-lg font-medium transition-colors',
              currentPage === page
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-white'
            ]"
          >
            {{ page }}
          </button>
        </div>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <i class="ph-bold ph-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref } from 'vue'

interface Column {
  key: string
  label: string
  width?: string
  format?: (value: any) => string
}

interface Props {
  rows: T[]
  columns: Column[]
  title?: string
  subtitle?: string
  showHeader?: boolean
  showPagination?: boolean
  pageSize?: number
  rowKey?: string
  selectable?: boolean
  emptyMessage?: string
  sortable?: boolean
}

interface Emits {
  (e: 'row-selected', rows: T[]): void
  (e: 'sort', key: string, order: 'asc' | 'desc'): void
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showPagination: true,
  pageSize: 10,
  rowKey: 'id',
  selectable: false,
  emptyMessage: 'No data available',
  sortable: true
})

const emit = defineEmits<Emits>()

// State
const currentPage = ref(1)
const selectedRows = ref<Set<any>>(new Set())
const sortKey = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Computed
const totalRecords = computed(() => props.rows.length)
const totalPages = computed(() => Math.ceil(totalRecords.value / props.pageSize))

const displayedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return props.rows.slice(start, end)
})

const startRecord = computed(() => {
  if (totalRecords.value === 0) return 0
  return (currentPage.value - 1) * props.pageSize + 1
})

const endRecord = computed(() => {
  const end = currentPage.value * props.pageSize
  return Math.min(end, totalRecords.value)
})

const pageNumbers = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const allSelected = computed(() => {
  if (displayedRows.value.length === 0) return false
  return displayedRows.value.every(row => isRowSelected(row))
})

const hasActions = computed(() => true) // Has actions slot

// Methods
const getRowKey = (row: T): string => {
  return String(row[props.rowKey as keyof T])
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

const formatValue = (value: any, column: Column): string => {
  if (value === null || value === undefined) return '-'
  if (column.format) return column.format(value)
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

const isRowSelected = (row: T): boolean => {
  return selectedRows.value.has(getRowKey(row))
}

const toggleRow = (row: T): void => {
  const key = getRowKey(row)
  if (selectedRows.value.has(key)) {
    selectedRows.value.delete(key)
  } else {
    selectedRows.value.add(key)
  }
  emitSelected()
}

const toggleSelectAll = (): void => {
  if (allSelected.value) {
    displayedRows.value.forEach(row => {
      selectedRows.value.delete(getRowKey(row))
    })
  } else {
    displayedRows.value.forEach(row => {
      selectedRows.value.add(getRowKey(row))
    })
  }
  emitSelected()
}

const emitSelected = (): void => {
  const selectedArray = props.rows.filter(row =>
    selectedRows.value.has(getRowKey(row))
  )
  emit('row-selected', selectedArray)
}

const nextPage = (): void => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = (): void => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const goToPage = (page: number): void => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const sort = (key: string): void => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  emit('sort', key, sortOrder.value)
}
</script>

<style scoped>
input[type='checkbox'] {
  accent-color: currentColor;
}
</style>
