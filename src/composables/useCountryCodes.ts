import { ref } from 'vue'

export interface CountryCode {
  code: string
  name: string
  flag: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
]

export function useCountryCodes() {
  const selectedCountryCode = ref<string>('+91') // Default to India
  
  const getCountryByCode = (code: string): CountryCode | undefined => {
    return COUNTRY_CODES.find(country => country.code === code)
  }
  
  const setCountryCode = (code: string) => {
    const country = getCountryByCode(code)
    if (country) {
      selectedCountryCode.value = code
    }
  }
  
  const formatPhoneNumber = (countryCode: string, phoneNumber: string): string => {
    return `${countryCode} ${phoneNumber}`
  }
  
  const validatePhoneLength = (countryCode: string, phoneNumber: string): boolean => {
    // Basic validation - most mobile numbers are 7-15 digits
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    
    switch (countryCode) {
      case '+91': // India - 10 digits
        return cleanNumber.length === 10
      case '+1': // USA/Canada - 10 digits
        return cleanNumber.length === 10
      case '+44': // UK - 10-11 digits
        return cleanNumber.length >= 10 && cleanNumber.length <= 11
      case '+86': // China - 11 digits
        return cleanNumber.length === 11
      case '+81': // Japan - 10-11 digits
        return cleanNumber.length >= 10 && cleanNumber.length <= 11
      case '+971': // UAE - 9 digits
        return cleanNumber.length === 9
      case '+966': // Saudi Arabia - 9 digits
        return cleanNumber.length === 9
      default:
        // General validation for other countries
        return cleanNumber.length >= 7 && cleanNumber.length <= 15
    }
  }
  
  const getPhoneInputPlaceholder = (countryCode: string): string => {
    switch (countryCode) {
      case '+91':
        return '9876543210'
      case '+1':
        return '2125551234'
      case '+44':
        return '7911123456'
      case '+86':
        return '13912345678'
      case '+81':
        return '9012345678'
      case '+971':
        return '501234567'
      case '+966':
        return '501234567'
      default:
        return 'Phone number'
    }
  }
  
  const getPhoneInputMaxLength = (countryCode: string): number => {
    switch (countryCode) {
      case '+91':
      case '+1':
        return 10
      case '+44':
      case '+81':
        return 11
      case '+86':
        return 11
      case '+971':
      case '+966':
        return 9
      default:
        return 15
    }
  }
  
  return {
    selectedCountryCode,
    countryCodes: COUNTRY_CODES,
    getCountryByCode,
    setCountryCode,
    formatPhoneNumber,
    validatePhoneLength,
    getPhoneInputPlaceholder,
    getPhoneInputMaxLength
  }
}