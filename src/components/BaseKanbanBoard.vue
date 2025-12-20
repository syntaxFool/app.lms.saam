<template>
  <div class="h-full w-full">
    <!-- Mobile Tabs (visible on small screens) -->
    <div
      v-if="isMobile"
      class="bg-white border-b border-slate-200 py-2 overflow-x-auto no-scrollbar shrink-0 z-10"
    >
      <div class="flex px-4 gap-3 min-w-max">
        <button
          v-for="status in statuses"
          :key="status"
          @click="activeMobileTab = status"
          :class="[
            'mobile-tab-btn px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all',
            activeMobileTab === status
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
          ]"
        >
          {{ status }}
        </button>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board h-full w-full p-4 md:p-6 flex gap-6 overflow-x-auto">
      <div
        v-for="status in statuses"
        :key="status"
        :class="[
          'kanban-column flex flex-col h-full w-full md:w-80 md:bg-slate-100 md:rounded-xl md:border md:border-slate-200 overflow-hidden shrink-0',
          isMobile && activeMobileTab !== status ? 'hidden' : 'flex'
        ]"
      >
        <!-- Column Header -->
        <div class="px-4 py-3 md:bg-white md:border-b md:border-slate-200 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full" :class="getStatusColor(status)"></div>
            <h2 class="font-bold text-slate-700">{{ status }}</h2>
          </div>
          <span class="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {{ getColumnItems(status).length }}
          </span>
        </div>

        <!-- Column Content (Draggable) -->
        <div
          class="flex-1 overflow-y-auto p-3 space-y-3 overscroll-contain"
          @dragover.prevent
          @drop="handleDrop($event, status)"
        >
          <!-- Empty State -->
          <div
            v-if="getColumnItems(status).length === 0"
            class="flex flex-col items-center justify-center h-48 text-slate-400 opacity-60"
          >
            <i class="ph-duotone ph-ghost text-4xl mb-2"></i>
            <p class="text-sm">Empty</p>
          </div>

          <!-- Cards -->
          <div
            v-for="item in getColumnItems(status)"
            :key="getItemKey(item)"
            draggable="true"
            @dragstart="handleDragStart($event, item, status)"
            @dragend="handleDragEnd"
            class="bg-white rounded-lg border border-slate-200 p-4 cursor-move hover:shadow-md transition-all group"
          >
            <!-- Card Header -->
            <div class="flex justify-between items-start gap-2 mb-2">
              <h3 class="font-semibold text-slate-900 text-sm leading-tight flex-1">
                {{ getNestedValue(item, titleKey) }}
              </h3>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="$emit('edit', item)"
                  class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  title="Edit"
                >
                  <i class="ph-bold ph-pencil text-sm"></i>
                </button>
                <button
                  @click="$emit('delete', item)"
                  class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <i class="ph-bold ph-trash text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Card Content Slot -->
            <slot name="card-content" :item="item">
              <p class="text-sm text-slate-600">{{ getNestedValue(item, descriptionKey) }}</p>
            </slot>

            <!-- Card Footer -->
            <slot name="card-footer" :item="item" :status="status" />
          </div>
        </div>

        <!-- Add New Button -->
        <div v-if="showAddButton" class="p-3 border-t border-slate-200 md:bg-white shrink-0">
          <button
            @click="$emit('add', status)"
            class="w-full py-2 px-3 text-sm font-medium text-slate-700 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <i class="ph-bold ph-plus text-lg"></i>
            Add Item
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref } from 'vue'

interface Props {
  items: T[]
  statuses: string[]
  statusKey?: string
  itemKey?: string
  titleKey?: string
  descriptionKey?: string
  showAddButton?: boolean
  statusColorMap?: Record<string, string>
  groupByStatus?: boolean
}

interface Emits {
  (e: 'status-change', item: T, newStatus: string): void
  (e: 'edit', item: T): void
  (e: 'delete', item: T): void
  (e: 'add', status: string): void
}

const props = withDefaults(defineProps<Props>(), {
  statusKey: 'status',
  itemKey: 'id',
  titleKey: 'name',
  descriptionKey: 'description',
  showAddButton: true,
  groupByStatus: true,
  statusColorMap: () => ({
    'New': 'bg-blue-500',
    'Contacted': 'bg-yellow-500',
    'Proposal': 'bg-purple-500',
    'Won': 'bg-green-500',
    'Lost': 'bg-red-500'
  })
})

const emit = defineEmits<Emits>()

// State
const activeMobileTab = ref(props.statuses[0])
const draggedItem = ref<T | null>(null)
const draggedFromStatus = ref<string>('')
const isMobile = ref(window.innerWidth < 768)

// Watch window resize
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
}

// Computed
const itemsByStatus = computed(() => {
  const grouped: Record<string, T[]> = {}
  props.statuses.forEach(status => {
    grouped[status] = []
  })

  props.items.forEach(item => {
    const status = getNestedValue(item, props.statusKey)
    if (grouped[status]) {
      grouped[status].push(item)
    }
  })

  return grouped
})

// Methods
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

const getItemKey = (item: T): string => {
  return String(getNestedValue(item, props.itemKey))
}

const getColumnItems = (status: string): T[] => {
  return itemsByStatus.value[status] || []
}

const getStatusColor = (status: string): string => {
  return props.statusColorMap?.[status] || 'bg-slate-500'
}

const handleDragStart = (event: DragEvent, item: T, status: string): void => {
  draggedItem.value = item
  draggedFromStatus.value = status
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnd = (): void => {
  draggedItem.value = null
  draggedFromStatus.value = ''
}

const handleDrop = (event: DragEvent, newStatus: string): void => {
  event.preventDefault()

  if (!draggedItem.value) return

  if (newStatus !== draggedFromStatus.value) {
    emit('status-change', draggedItem.value, newStatus)
  }

  draggedItem.value = null
  draggedFromStatus.value = ''
}
</script>

<style scoped>
.kanban-board {
  --webkit-overflow-scrolling: touch;
}

.kanban-column::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.kanban-column::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-column::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-column::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
