<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Import Leads from CSV</h2>
              <p class="text-xs text-slate-500 mt-0.5">Phone is required. Empty rows are skipped.</p>
            </div>
            <button @click="close" class="p-2 hover:bg-slate-100 rounded-lg transition">
              <i class="ph-bold ph-x text-slate-500 text-lg"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">

            <!-- Step 1: Upload -->
            <div v-if="step === 'upload'">
              <label
                class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition"
                @dragover.prevent
                @drop.prevent="handleDrop"
              >
                <i class="ph-bold ph-file-csv text-4xl text-slate-400"></i>
                <div class="text-center">
                  <p class="text-sm font-semibold text-slate-700">Drop CSV file here or click to browse</p>
                  <p class="text-xs text-slate-400 mt-1">Accepts .csv files only</p>
                </div>
                <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileSelect" />
              </label>
              <p v-if="parseError" class="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                <i class="ph-bold ph-warning-circle"></i> {{ parseError }}
              </p>
            </div>

            <!-- Step 2: Preview -->
            <div v-else-if="step === 'preview'">
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-slate-700">
                  Preview — {{ previewRows.length }} of {{ parsedRows.length }} rows shown
                </p>
                <button @click="reset" class="text-xs text-slate-500 hover:text-slate-700 underline">Change file</button>
              </div>
              <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-xs">
                  <thead class="bg-slate-50">
                    <tr>
                      <th v-for="col in previewColumns" :key="col" class="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in previewRows" :key="i" class="border-t border-slate-100">
                      <td v-for="col in previewColumns" :key="col" class="px-3 py-2 text-slate-700 max-w-[120px] truncate">{{ row[col] || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-slate-400 mt-2">
                {{ validRows }} valid rows will be imported, {{ invalidRows }} skipped (missing phone).
              </p>
            </div>

            <!-- Step 3: Result -->
            <div v-else-if="step === 'result'" class="text-center py-6">
              <i class="ph-bold ph-check-circle text-5xl text-green-500 mb-3 block"></i>
              <p class="text-lg font-bold text-slate-800">Import complete</p>
              <p class="text-sm text-slate-500 mt-1">
                <span class="text-green-600 font-semibold">{{ resultSuccess }} imported</span>
                <span v-if="resultFailed > 0"> · <span class="text-red-500 font-semibold">{{ resultFailed }} failed</span></span>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-200 shrink-0 flex justify-end gap-3">
            <button v-if="step !== 'result'" @click="close" class="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">
              Cancel
            </button>
            <button
              v-if="step === 'preview'"
              @click="runImport"
              :disabled="importing || validRows === 0"
              class="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <i v-if="importing" class="ph-bold ph-spinner-gap animate-spin"></i>
              <i v-else class="ph-bold ph-upload-simple"></i>
              {{ importing ? `Importing… (${importProgress}/${validRows})` : `Import ${validRows} leads` }}
            </button>
            <button
              v-if="step === 'result'"
              @click="close"
              class="px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeadsStore } from '@/stores/leads'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; imported: [count: number] }>()

const leadsStore = useLeadsStore()

const CSV_COLUMNS = ['name', 'phone', 'email', 'status', 'temperature', 'interest', 'source', 'location', 'assignedTo', 'value', 'age', 'priorExperience', 'notes', 'followUpDate']

type ParsedRow = Record<string, string>

const step = ref<'upload' | 'preview' | 'result'>('upload')
const fileInput = ref<HTMLInputElement | null>(null)
const parsedRows = ref<ParsedRow[]>([])
const parseError = ref('')
const importing = ref(false)
const importProgress = ref(0)
const resultSuccess = ref(0)
const resultFailed = ref(0)

const previewColumns = computed(() => {
  if (!parsedRows.value.length) return []
  const allKeys = Object.keys(parsedRows.value[0])
  return allKeys.slice(0, 7)
})

const previewRows = computed(() => parsedRows.value.slice(0, 5))

const validRows = computed(() => parsedRows.value.filter(r => r.phone?.trim()).length)
const invalidRows = computed(() => parsedRows.value.length - validRows.value)

function close() {
  reset()
  emit('close')
}

function reset() {
  step.value = 'upload'
  parsedRows.value = []
  parseError.value = ''
  importing.value = false
  importProgress.value = 0
  resultSuccess.value = 0
  resultFailed.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseFile(file)
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) parseFile(file)
}

function parseFile(file: File) {
  parseError.value = ''
  if (!file.name.endsWith('.csv')) {
    parseError.value = 'Only .csv files are accepted.'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const rows = parseCsv(text)
    if (!rows.length) {
      parseError.value = 'File is empty or has no valid rows.'
      return
    }
    parsedRows.value = rows
    step.value = 'preview'
  }
  reader.readAsText(file)
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const results: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (values.every(v => !v)) continue
    const row: ParsedRow = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    results.push(row)
  }
  return results
}

async function runImport() {
  importing.value = true
  importProgress.value = 0
  resultSuccess.value = 0
  resultFailed.value = 0

  const rows = parsedRows.value.filter(r => r.phone?.trim())

  for (const row of rows) {
    try {
      await leadsStore.addNewLead({
        name: row.name || undefined,
        phone: row.phone,
        email: row.email || undefined,
        status: (row.status as any) || 'New',
        temperature: (row.temperature as any) || undefined,
        interest: row.interest || undefined,
        source: row.source || undefined,
        location: row.location || undefined,
        assignedTo: row.assignedTo || undefined,
        value: row.value ? parseFloat(row.value) : undefined,
        age: row.age ? parseInt(row.age) : undefined,
        priorExperience: row.priorExperience || undefined,
        notes: row.notes || undefined,
        followUpDate: row.followUpDate || undefined,
      })
      resultSuccess.value++
    } catch {
      resultFailed.value++
    }
    importProgress.value++
  }

  importing.value = false
  step.value = 'result'
  emit('imported', resultSuccess.value)
}
</script>
