<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition"
      :class="dropdownClasses"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-base">{{ selectedCountry?.flag }}</span>
        <span class="truncate">{{ selectedCountry?.code }}</span>
      </div>
      <i class="ph-bold ph-caret-down text-xs transition-transform duration-200" 
         :class="{ 'rotate-180': isOpen }"></i>
    </button>
    
    <Teleport to="body">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50"
        @click="isOpen = false"
      >
        <div 
          class="absolute bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
          :style="dropdownStyles"
          @click.stop
        >
          <div class="p-2">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search countries..."
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="country in filteredCountries"
              :key="country.code"
              @click="selectCountry(country)"
              type="button"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 outline-none transition"
              :class="{ 'bg-primary/10 text-primary': modelValue === country.code }"
            >
              <span class="text-lg">{{ country.flag }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ country.code }}</span>
                  <span class="text-sm text-slate-600 truncate">{{ country.name }}</span>
                </div>
              </div>
              <i v-if="modelValue === country.code" class="ph-bold ph-check text-primary"></i>
            </button>
          </div>
          
          <div v-if="filteredCountries.length === 0" class="px-4 py-8 text-center text-slate-500">
            <i class="ph-bold ph-magnifying-glass text-2xl mb-2"></i>
            <p class="text-sm">No countries found</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useCountryCodes, type CountryCode } from '@/composables/useCountryCodes'

interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select country',
  disabled: false,
  size: 'md'
})

const emit = defineEmits<Emits>()

const { countryCodes, getCountryByCode } = useCountryCodes()

const dropdownRef = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const isOpen = ref(false)
const searchQuery = ref('')
const dropdownStyles = ref({})

const selectedCountry = computed(() => {
  return getCountryByCode(props.modelValue)
})

const filteredCountries = computed(() => {
  if (!searchQuery.value) return countryCodes
  
  const query = searchQuery.value.toLowerCase()
  return countryCodes.filter(country => 
    country.name.toLowerCase().includes(query) ||
    country.code.toLowerCase().includes(query)
  )
})

const dropdownClasses = computed(() => {
  const classes = []
  
  if (props.disabled) {
    classes.push('opacity-50 cursor-not-allowed')
  }
  
  switch (props.size) {
    case 'sm':
      classes.push('px-2 py-1.5 text-xs')
      break
    case 'lg':
      classes.push('px-4 py-3 text-base')
      break
    default:
      classes.push('px-3 py-2.5 text-sm')
  }
  
  return classes.join(' ')
})

const selectCountry = (country: CountryCode) => {
  emit('update:modelValue', country.code)
  isOpen.value = false
  searchQuery.value = ''
}

const updateDropdownPosition = () => {
  if (!dropdownRef.value || !isOpen.value) return
  
  const rect = dropdownRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const dropdownHeight = 240 // max-h-60 = 15rem = 240px
  
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  
  const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
  
  dropdownStyles.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    top: shouldOpenUpward ? `${rect.top - dropdownHeight - 4}px` : `${rect.bottom + 4}px`,
  }
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isOpen.value = false
    searchQuery.value = ''
  }
}

watch(isOpen, async (newValue) => {
  if (newValue) {
    await nextTick()
    updateDropdownPosition()
    searchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})
</script>