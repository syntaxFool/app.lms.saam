import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'
import { enqueue, getQueueStatus } from './queue'
import { isOnline, retryWithBackoff } from './offline'
import { get as getCached, set as setCached } from './cache'

// Configuration for the API client
const isDev = import.meta.env.DEV
const API_CONFIG = {
  // Use Netlify Function proxy in dev, direct GAS URL in production
  baseURL: isDev 
    ? '/.netlify/functions/proxy'
    : (import.meta.env.VITE_API_BASE_URL as string) || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
}

// Create the main API client
export const apiClient: AxiosInstance = axios.create(API_CONFIG)

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem('lms_auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add timestamp for cache busting
    if (config.params) {
      config.params._t = Date.now()
    } else {
      config.params = { _t: Date.now() }
    }
    
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor with offline support
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Response Error:', error)
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('lms_auth_token')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      // Forbidden - show error message
      console.error('Access forbidden')
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server error')
    }
    
    // If offline, queue the request for later
    if (!isOnline() && error.code === 'ECONNABORTED' || !error.response) {
      console.warn('Request queued for later - currently offline')
    }
    
    return Promise.reject(error)
  }
)

// API client with caching and offline support
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig, useCache = true): Promise<ApiResponse<T>> => {
    // Try cache first if enabled
    if (useCache) {
      const cached = getCached<ApiResponse<T>>(`GET:${url}`)
      if (cached) {
        return Promise.resolve(cached)
      }
    }

    const request = async () => {
      // Interceptor already returns response.data
      const data = await apiClient.get(url, config) as ApiResponse<T>

      // Cache successful responses
      if (useCache && data?.success) {
        setCached(`GET:${url}`, data, 5 * 60 * 1000, ['api-read', url])
      }

      return data
    }

    return retryWithBackoff(request, 2, 500)
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const request = async () => {
      // Interceptor already returns response.data
      return await apiClient.post(url, data, config) as ApiResponse<T>
    }

    return retryWithBackoff(request, 2, 500)
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const request = async () => {
      // Interceptor already returns response.data
      return await apiClient.put(url, data, config) as ApiResponse<T>
    }

    return retryWithBackoff(request, 2, 500)
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const request = async () => {
      // Interceptor already returns response.data
      return await apiClient.delete(url, config) as ApiResponse<T>
    }

    return retryWithBackoff(request, 2, 500)
  },

  /**
   * Queue a request if offline, execute if online
   */
  queue: <T = any>(
    fn: () => Promise<ApiResponse<T>>,
    priority = 0
  ): Promise<ApiResponse<T>> => {
    if (isOnline()) {
      return fn()
    }
    return enqueue(fn, priority)
  }
}

// Google Apps Script specific API helpers
export const gasApi = {
  // Execute a specific function in Google Apps Script
  execute: async (functionName: string, parameters: any = {}): Promise<ApiResponse> => {
    try {
      const cacheKey = `GAS:${functionName}`
      
      // Check cache for read operations
      if (functionName.startsWith('get') || functionName.startsWith('fetch')) {
        const cached = getCached<ApiResponse>(cacheKey)
        if (cached) {
          return cached
        }
      }

      const request = async (): Promise<ApiResponse> => {
        const data = await apiClient.post<ApiResponse>('', {
          function: functionName,
          parameters: Array.isArray(parameters) ? parameters : [parameters]
        }) as unknown as ApiResponse
        
        // Cache read operations
        if ((functionName.startsWith('get') || functionName.startsWith('fetch')) && data.success) {
          setCached(cacheKey, data, 5 * 60 * 1000, ['gas-api', functionName])
        }

        return data
      }

      // Use retry with offline support
      return await retryWithBackoff(request, 2, 500)
    } catch (error) {
      console.error('GAS API Execute Error:', error)
      return {
        success: false,
        error: 'Failed to execute Google Apps Script function'
      }
    }
  },

  // Sync data with Google Sheets
  syncData: async (lastSyncTime?: number): Promise<ApiResponse> => {
    try {
      const params = lastSyncTime ? { lastSyncTime } : {}
      const cacheKey = `SYNC:${lastSyncTime || 'full'}`
      
      // Check cache first
      const cached = getCached<ApiResponse>(cacheKey)
      if (cached) {
        return cached
      }

      const request = async () => {
        // Interceptor already returns response.data
        return await apiClient.get('', { params }) as ApiResponse
      }

      const response = await retryWithBackoff(request, 2, 500)
      
      if (response.success) {
        setCached(cacheKey, response, 10 * 60 * 1000, ['sync', 'data'])
      }

      return response
    } catch (error) {
      console.error('GAS API Sync Error:', error)
      return {
        success: false,
        error: 'Failed to sync data with Google Sheets'
      }
    }
  },

  /**
   * Get batch data with parallel requests
   */
  batchExecute: async (
    functions: Array<{ name: string; params: any }>
  ): Promise<ApiResponse[]> => {
    const promises = functions.map(fn =>
      gasApi.execute(fn.name, fn.params).catch(err => ({
        success: false,
        error: err.message
      }))
    )
    return Promise.all(promises)
  },

  /**
   * Get queue status info
   */
  getQueueInfo: () => {
    return getQueueStatus()
  }
}

export default apiClient
