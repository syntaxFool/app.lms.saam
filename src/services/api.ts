import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'
import { enqueue, getQueueStatus } from './queue'
import { isOnline, retryWithBackoff } from './offline'
import { get as getCached, set as setCached } from './cache'

// Configuration for the API client
const API_CONFIG = {
  baseURL: '/api',
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
      // Unauthorized - clear token and navigate to login
      localStorage.removeItem('lms_auth_token')
      // Import router lazily to avoid circular dependency
      import('../router').then(({ default: router }) => {
        router.push('/login')
      })
    } else if (error.response?.status === 403) {
      // Forbidden - show error message
      console.error('Access forbidden')
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server error')
    }
    
    // If offline, queue the request for later
    if ((!isOnline() && error.code === 'ECONNABORTED') || !error.response) {
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

// LMS REST API helpers — replaces GAS function calls
export const gasApi = {
  // Sync/fetch leads from server (replaces gasApi.syncData)
  syncData: async (lastSyncTime?: number, page = 1, limit = 200): Promise<ApiResponse> => {
    try {
      const cacheKey = `SYNC:${lastSyncTime || 'full'}:p${page}:l${limit}`
      const cached = getCached<ApiResponse>(cacheKey)
      if (cached) return cached

      const params: Record<string, number> = { page, limit }
      if (lastSyncTime) params.since = lastSyncTime
      const request = async () =>
        await apiClient.get('/leads', { params }) as ApiResponse

      const response = await retryWithBackoff(request, 2, 500)
      if (response.success) {
        setCached(cacheKey, response, 5 * 60 * 1000, ['sync', 'leads'])
      }
      return response
    } catch (error) {
      console.error('Sync error:', error)
      return { success: false, error: 'Failed to sync leads' }
    }
  },

  // Unified execute — maps legacy GAS function names to REST calls
  execute: async (functionName: string, parameters: any = {}): Promise<ApiResponse> => {
    const p = Array.isArray(parameters) ? parameters[0] : parameters

    try {
      switch (functionName) {
        // ── Auth ──
        case 'authenticateUser':
          return await apiClient.post('/auth/login', p) as ApiResponse
        case 'validateToken':
          return await apiClient.get('/auth/validate') as ApiResponse
        case 'logoutUser':
          return await apiClient.post('/auth/logout') as ApiResponse

        // ── Leads ──
        case 'createLead':
          return await apiClient.post('/leads', p) as ApiResponse
        case 'updateLead': {
          const [id, data] = Array.isArray(parameters) ? parameters : [p?.id, p]
          return await apiClient.put(`/leads/${id}`, data) as ApiResponse
        }
        case 'deleteLead': {
          const id = Array.isArray(parameters) ? parameters[0] : p
          return await apiClient.delete(`/leads/${id}`) as ApiResponse
        }
        case 'bulkUpdate': {
          const leads: any[] = Array.isArray(parameters) ? parameters[0] : p
          const leadIds = leads.map((l: any) => l.id)
          const updates = { assignedTo: leads[0]?.assignedTo }
          return await apiClient.put('/leads/bulk', { leadIds, updates }) as ApiResponse
        }
        case 'bulkDelete': {
          const leadIds = Array.isArray(parameters) ? parameters[0] : p
          return await apiClient.delete('/leads/bulk', { data: { leadIds } }) as ApiResponse
        }
        case 'checkUpdates': {
          const since = Array.isArray(parameters) ? parameters[0] : p
          return await apiClient.get('/leads/check-updates', { params: { since } }) as ApiResponse
        }

        // ── Users ──
        case 'getUsers':
          return await apiClient.get('/users') as ApiResponse
        case 'createUser':
          return await apiClient.post('/users', p) as ApiResponse
        case 'updateUser': {
          const [uid, udata] = Array.isArray(parameters) ? parameters : [p?.id, p]
          return await apiClient.put(`/users/${uid}`, udata) as ApiResponse
        }
        case 'deleteUser': {
          const uid = Array.isArray(parameters) ? parameters[0] : p
          return await apiClient.delete(`/users/${uid}`) as ApiResponse
        }

        default:
          console.warn(`Unknown API function: ${functionName}`)
          return { success: false, error: `Unknown function: ${functionName}` }
      }
    } catch (error) {
      console.error(`API Execute Error [${functionName}]:`, error)
      return { success: false, error: `Request failed: ${functionName}` }
    }
  },

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

  getQueueInfo: () => getQueueStatus()
}

export default apiClient
