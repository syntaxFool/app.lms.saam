import { reactive, computed } from 'vue'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  email?: boolean
  phone?: boolean
}

export interface FormErrors {
  [key: string]: string[]
}

/**
 * Composable for form validation
 * Handles field-level validation with custom rules
 */
export function useFormValidation<T extends Record<string, any>>(initialValues: T) {
  const values = reactive({ ...initialValues }) as T
  const errors = reactive<FormErrors>({})
  const touched = reactive<Record<string, boolean>>({})

  const isValid = computed(() => 
    Object.keys(errors).length === 0 && Object.values(touched).some(v => v)
  )

  const isDirty = computed(() => 
    Object.values(touched).some(v => v)
  )

  /**
   * Validate a single field
   */
  function validateField(field: keyof T, rules: ValidationRule, value: any = (values as any)[field]): string[] {
    const fieldErrors: string[] = []

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      fieldErrors.push(`${String(field)} is required`)
    }

    // Skip other validations if empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return fieldErrors
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push(`${String(field)} must be at least ${rules.minLength} characters`)
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        fieldErrors.push(`${String(field)} must be at most ${rules.maxLength} characters`)
      }
      if (rules.email && !isValidEmail(value)) {
        fieldErrors.push(`${String(field)} must be a valid email`)
      }
      if (rules.phone && !isValidPhone(value)) {
        fieldErrors.push(`${String(field)} must be a valid phone number`)
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        fieldErrors.push(`${String(field)} format is invalid`)
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        fieldErrors.push(`${String(field)} must be at least ${rules.min}`)
      }
      if (rules.max !== undefined && value > rules.max) {
        fieldErrors.push(`${String(field)} must be at most ${rules.max}`)
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value)
      if (result !== true) {
        fieldErrors.push(typeof result === 'string' ? result : `${String(field)} is invalid`)
      }
    }

    return fieldErrors
  }

  /**
   * Validate all fields
   */
  function validate(validationRules: Record<keyof T, ValidationRule>): boolean {
    const newErrors: FormErrors = {}

    Object.keys(validationRules).forEach(field => {
      const fieldName = field as keyof T
      const fieldErrors = validateField(fieldName, validationRules[fieldName])
      if (fieldErrors.length > 0) {
        newErrors[field] = fieldErrors
      }
    })

    Object.assign(errors, newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Mark field as touched
   */
  function touch(field: keyof T) {
    (touched as Record<string, boolean>)[field as string] = true
  }

  /**
   * Mark all fields as touched
   */
  function touchAll() {
    Object.keys(values).forEach(field => {
      (touched as Record<string, boolean>)[field] = true
    })
  }

  /**
   * Set field value
   */
  function setFieldValue(field: keyof T, value: any) {
    values[field] = value
  }

  /**
   * Set field error
   */
  function setFieldError(field: keyof T, errorMessages: string[]) {
    if (errorMessages.length > 0) {
      errors[field as string] = errorMessages
    } else {
      delete errors[field as string]
    }
  }

  /**
   * Clear field error
   */
  function clearFieldError(field: keyof T) {
    delete errors[field as string]
  }

  /**
   * Clear all errors
   */
  function clearErrors() {
    Object.keys(errors).forEach(field => {
      delete errors[field]
    })
  }

  /**
   * Reset form to initial values
   */
  function reset() {
    Object.assign(values, initialValues)
    Object.assign(errors, {})
    Object.assign(touched, {})
  }

  /**
   * Get field state
   */
  function getFieldState(field: keyof T) {
    const fieldStr = field as string
    return {
      value: (values as any)[field],
      error: errors[fieldStr],
      touched: (touched as Record<string, boolean>)[fieldStr],
      hasError: !!(errors[fieldStr] && (touched as Record<string, boolean>)[fieldStr])
    }
  }

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    validateField,
    validate,
    touch,
    touchAll,
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearErrors,
    reset,
    getFieldState
  }
}

/**
 * Helper function to validate email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper function to validate phone
 */
function isValidPhone(phone: string): boolean {
  // Basic phone validation - at least 7 digits
  const phoneRegex = /\d{7,}/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}
