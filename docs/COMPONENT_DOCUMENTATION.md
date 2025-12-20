# Reusable Vue Components Documentation

This document covers the three main reusable components created for the LMS application: **Modal**, **Data Table**, and **Kanban Board**.

## Table of Contents
1. [BaseModal](#basemodal)
2. [BaseDataTable](#basedatatable)
3. [BaseKanbanBoard](#basekanbanboard)
4. [Usage Examples](#usage-examples)

---

## BaseModal

A reusable modal component with built-in header, footer, and customizable content.

### Location
`src/components/BaseModal.vue`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls modal visibility |
| `title` | `string` | - | Modal header title |
| `showFooter` | `boolean` | `true` | Show/hide footer with action buttons |
| `submitLabel` | `string` | `'Submit'` | Text for submit button |
| `cancelLabel` | `string` | `'Cancel'` | Text for cancel button |
| `isSubmitting` | `boolean` | `false` | Show loading spinner on submit button |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | - | Emitted when modal should close |
| `submit` | - | Emitted when submit button is clicked |

### Slots

| Slot | Context | Description |
|------|---------|-------------|
| `default` | - | Main content area |
| (footer) | - | Built-in, customizable with props |

### Example Usage

```vue
<template>
  <div>
    <button @click="isModalOpen = true">Open Modal</button>

    <BaseModal
      :is-open="isModalOpen"
      title="Create New Lead"
      submit-label="Create"
      @close="isModalOpen = false"
      @submit="handleSubmit"
    >
      <form class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input v-model="form.name" type="text" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full border rounded px-3 py-2" />
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const isModalOpen = ref(false)
const form = reactive({ name: '', email: '' })

const handleSubmit = () => {
  console.log('Submit form:', form)
  isModalOpen.value = false
}
</script>
```

### Features
- ✅ Teleported to body for proper z-index stacking
- ✅ Smooth fade and scale animations
- ✅ Loading state support with spinner
- ✅ Customizable footer with actions
- ✅ Click outside to close (keyboard ESC support can be added)

---

## BaseDataTable

A fully-featured data table with sorting, pagination, selection, and custom cell rendering.

### Location
`src/components/BaseDataTable.vue`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `T[]` | - | Array of data to display |
| `columns` | `Column[]` | - | Column definitions |
| `title` | `string` | - | Table title |
| `subtitle` | `string` | - | Table subtitle |
| `showHeader` | `boolean` | `true` | Show/hide header section |
| `showPagination` | `boolean` | `true` | Show/hide pagination |
| `pageSize` | `number` | `10` | Items per page |
| `rowKey` | `string` | `'id'` | Property to use as unique key |
| `selectable` | `boolean` | `false` | Enable row selection with checkboxes |
| `emptyMessage` | `string` | `'No data available'` | Message when no rows |
| `sortable` | `boolean` | `true` | Enable column sorting |

### Column Definition

```typescript
interface Column {
  key: string           // Property key from row data
  label: string         // Display label
  width?: string        // CSS width (e.g., '200px')
  format?: (value: any) => string  // Custom formatter function
}
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-selected` | `T[]` | Emitted when selection changes |
| `sort` | `(key: string, order: 'asc' \| 'desc')` | Emitted when sort requested |

### Slots

| Slot | Context | Description |
|------|---------|-------------|
| `header-actions` | - | Buttons/controls in header |
| `cell-{columnKey}` | `{ value, row }` | Custom cell rendering |
| `row-actions` | `{ row }` | Action buttons for each row |

### Example Usage

```vue
<template>
  <BaseDataTable
    :rows="leads"
    :columns="columns"
    title="Active Leads"
    row-key="id"
    :page-size="20"
    selectable
    @row-selected="handleSelect"
  >
    <template #header-actions>
      <button @click="addLead" class="btn btn-primary">
        + Add Lead
      </button>
      <button v-if="selectedRows.length" @click="bulkDelete" class="btn btn-danger">
        Delete ({{ selectedRows.length }})
      </button>
    </template>

    <template #cell-status="{ value }">
      <span :class="['badge', `badge-${value.toLowerCase()}`]">
        {{ value }}
      </span>
    </template>

    <template #cell-value="{ value }">
      <span class="font-bold">${{ value.toLocaleString() }}</span>
    </template>

    <template #row-actions="{ row }">
      <button @click="editLead(row)" class="btn btn-sm">Edit</button>
      <button @click="deleteLead(row)" class="btn btn-sm btn-danger">Delete</button>
    </template>
  </BaseDataTable>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseDataTable from '@/components/BaseDataTable.vue'
import type { Lead } from '@/types'

const leads = ref<Lead[]>([])
const selectedRows = ref<Lead[]>([])

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'value', label: 'Value', format: (v) => `$${v.toLocaleString()}` }
]

const handleSelect = (rows: Lead[]) => {
  selectedRows.value = rows
}

const addLead = () => { /* ... */ }
const editLead = (lead: Lead) => { /* ... */ }
const deleteLead = (lead: Lead) => { /* ... */ }
const bulkDelete = () => { /* ... */ }
</script>
```

### Features
- ✅ Generic TypeScript support for any data type
- ✅ Configurable pagination with smart page buttons
- ✅ Multi-row selection with "select all" checkbox
- ✅ Custom cell rendering via slots
- ✅ Empty state messaging
- ✅ Responsive design with horizontal scroll on mobile
- ✅ Row action buttons
- ✅ Header with title, subtitle, and custom actions

---

## BaseKanbanBoard

A drag-and-drop kanban board for managing items across different statuses.

### Location
`src/components/BaseKanbanBoard.vue`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | - | Array of items to display |
| `statuses` | `string[]` | - | Available status columns |
| `statusKey` | `string` | `'status'` | Property name for status |
| `itemKey` | `string` | `'id'` | Property name for unique ID |
| `titleKey` | `string` | `'name'` | Property name for card title |
| `descriptionKey` | `string` | `'description'` | Property for card description |
| `showAddButton` | `boolean` | `true` | Show "Add Item" button per column |
| `statusColorMap` | `Record<string, string>` | (default colors) | Status -> CSS class mapping |
| `groupByStatus` | `boolean` | `true` | Group items by status |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `status-change` | `(item: T, newStatus: string)` | Item dragged to new status |
| `edit` | `(item: T)` | Edit button clicked |
| `delete` | `(item: T)` | Delete button clicked |
| `add` | `(status: string)` | Add button clicked for status |

### Slots

| Slot | Context | Description |
|------|---------|-------------|
| `card-content` | `{ item }` | Custom card body content |
| `card-footer` | `{ item, status }` | Content below card body |

### Example Usage

```vue
<template>
  <BaseKanbanBoard
    :items="leads"
    :statuses="['New', 'Contacted', 'Proposal', 'Won', 'Lost']"
    status-key="status"
    title-key="name"
    description-key="email"
    @status-change="updateLeadStatus"
    @edit="openEditModal"
    @delete="deleteLead"
    @add="openNewLeadModal"
  >
    <template #card-content="{ item }">
      <div class="space-y-2 text-sm">
        <p><i class="ph-envelope-simple mr-1"></i> {{ item.email }}</p>
        <p><i class="ph-phone mr-1"></i> {{ item.phone }}</p>
      </div>
    </template>

    <template #card-footer="{ item }">
      <div class="mt-3 flex items-center justify-between">
        <span class="badge" :class="[`badge-${item.temperature}`]">
          {{ item.temperature }}
        </span>
        <span class="text-xs text-slate-500">{{ item.assignedTo }}</span>
      </div>
    </template>
  </BaseKanbanBoard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseKanbanBoard from '@/components/BaseKanbanBoard.vue'
import type { Lead } from '@/types'

const leads = ref<Lead[]>([])

const updateLeadStatus = (lead: Lead, newStatus: string) => {
  const index = leads.value.findIndex(l => l.id === lead.id)
  if (index !== -1) {
    leads.value[index].status = newStatus as any
  }
}

const openEditModal = (lead: Lead) => { /* ... */ }
const deleteLead = (lead: Lead) => { /* ... */ }
const openNewLeadModal = (status: string) => { /* ... */ }
</script>
```

### Features
- ✅ Drag-and-drop between columns
- ✅ Mobile-friendly with tab switching
- ✅ Status color indicators
- ✅ Item count per column
- ✅ Empty state messaging
- ✅ Responsive design
- ✅ Customizable card content
- ✅ Edit/Delete buttons on hover
- ✅ Add new item button per column

---

## Usage Examples

### Complete Lead Management Page

```vue
<template>
  <div class="space-y-6 p-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Lead Management</h1>
      <div class="flex gap-3">
        <button @click="viewMode = 'table'" :class="['btn', viewMode === 'table' && 'btn-active']">
          <i class="ph-bold ph-list mr-2"></i> Table
        </button>
        <button @click="viewMode = 'kanban'" :class="['btn', viewMode === 'kanban' && 'btn-active']">
          <i class="ph-bold ph-kanban mr-2"></i> Kanban
        </button>
      </div>
    </div>

    <!-- Table View -->
    <ExampleLeadTable v-if="viewMode === 'table'" />

    <!-- Kanban View -->
    <ExampleLeadKanban v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExampleLeadTable from '@/components/ExampleLeadTable.vue'
import ExampleLeadKanban from '@/components/ExampleLeadKanban.vue'

const viewMode = ref<'table' | 'kanban'>('table')
</script>
```

### With Forms and Modals

```vue
<template>
  <div>
    <ExampleLeadTable />

    <!-- Edit Modal -->
    <BaseModal
      :is-open="isEditModalOpen"
      title="Edit Lead"
      :is-submitting="isSubmitting"
      @close="isEditModalOpen = false"
      @submit="handleUpdate"
    >
      <LeadForm v-model="editingLead" />
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ExampleLeadTable from '@/components/ExampleLeadTable.vue'
import LeadForm from '@/components/LeadForm.vue'

const isEditModalOpen = ref(false)
const isSubmitting = ref(false)
const editingLead = reactive({})

const handleUpdate = async () => {
  isSubmitting.value = true
  try {
    await updateLead(editingLead)
    isEditModalOpen.value = false
  } finally {
    isSubmitting.value = false
  }
}

const updateLead = async (lead: any) => {
  // API call
}
</script>
```

---

## Best Practices

### 1. **Type Safety**
Always define proper types for your data and use generic constraints:

```typescript
interface CustomData extends Record<string, any> {
  id: string
  name: string
  // ... other properties
}

<BaseDataTable<CustomData> :rows="items" :columns="columns" />
```

### 2. **Responsive Design**
Both table and kanban are fully responsive. On mobile:
- Table: Horizontal scroll for columns
- Kanban: Vertical tab switching

### 3. **Performance**
For large datasets:
- Use pagination on tables (default: 10 items/page)
- Implement virtual scrolling for 1000+ items
- Memoize computed properties

### 4. **Customization**
Use slots extensively to customize appearance:

```vue
<template #cell-status="{ value, row }">
  <!-- Custom rendering per status -->
  <CustomStatusBadge :status="value" :row="row" />
</template>
```

### 5. **State Management**
For complex apps, integrate with Pinia stores:

```typescript
// In a view component
const leadStore = useLeadStore()

<BaseDataTable
  :rows="leadStore.leads"
  @row-selected="(rows) => leadStore.setSelected(rows)"
/>
```

---

## Integration with Existing Components

These components are designed to work alongside your existing components:

- **LeadForm.vue** - Use in modals for creating/editing
- **LeadCard.vue** - Use as card-content slot in kanban
- **ActivityTimeline.vue** - Show in modal details
- **TaskList.vue** - Display in card footer

See [ExampleLeadKanban.vue](src/components/ExampleLeadKanban.vue) and [ExampleLeadTable.vue](src/components/ExampleLeadTable.vue) for integration patterns.

---

## Styling

All components use Tailwind CSS and Phosphor icons (same as your project).

To customize colors and spacing:
- Modify Tailwind classes directly in component code
- Use CSS variables for theme colors
- Override in parent component styles

Example theme override:

```vue
<style scoped>
:deep(.kanban-column) {
  @apply bg-gradient-to-b from-blue-50 to-white;
}
</style>
```

---

## Troubleshooting

### Modal not showing?
- Ensure parent has `position: relative` or modal is in correct z-index
- Check `isOpen` prop is bound correctly
- Modal is teleported to `body`, so check document flow

### Table sorting not working?
- Implement sort handler in parent component
- Re-sort `rows` array and update reactive state
- For backend sorting, emit 'sort' event to parent API call

### Kanban drag-drop not working?
- Check `statusKey` matches your data property name
- Ensure statuses array includes all possible status values
- Verify items have unique `itemKey` values

---

## File Summary

| File | Purpose |
|------|---------|
| `BaseModal.vue` | Generic modal container |
| `BaseDataTable.vue` | Reusable data table with all features |
| `BaseKanbanBoard.vue` | Drag-drop kanban board |
| `ExampleLeadKanban.vue` | Example kanban implementation |
| `ExampleLeadTable.vue` | Example table implementation |

