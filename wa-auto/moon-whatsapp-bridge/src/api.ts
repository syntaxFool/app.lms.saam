/**
 * LMS API client — authenticated with X-API-Key header.
 * Moon uses this to check duplicates, create leads, log activities,
 * and post notifications.
 */

import axios, { AxiosInstance } from 'axios'
import { config } from './config'

const api: AxiosInstance = axios.create({
  baseURL: config.lmsApiUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': config.moonApiKey,
    'X-Service-Name': config.serviceName,
  },
})

// Unwrap axios response to get response.data directly
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error(`[${config.serviceName} API] Error:`, err.response?.status, err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export interface LeadCheckResult {
  exists: boolean
  leads: Array<{
    id: string
    name: string
    phone: string
    status: string
    assignedTo: string
  }>
}

export const lmsApi = {
  /** Check if a phone number already exists as a lead */
  checkDuplicate: async (phone: string): Promise<LeadCheckResult> => {
    const encoded = encodeURIComponent(phone)
    const response = await api.get(`/leads/check-duplicate/${encoded}`) as any
    return response.data
  },

  /** Create a new lead */
  createLead: async (data: {
    phone: string
    name?: string
    status?: string
    notes?: string
    source?: string
  }) => {
    const response = await api.post('/leads', data) as any
    return response.data
  },

  /** Add an activity to an existing lead */
  addActivity: async (leadId: string, data: { type: string; note: string }) => {
    const response = await api.post(`/leads/${leadId}/activities`, data) as any
    return response.data
  },

  /** Create a persistent notification (shows in LMS notification bell) */
  createNotification: async (payload: {
    title: string
    message: string
    type?: string
    leadId?: string
    createdBy?: string
  }) => {
    const response = await api.post('/notifications', payload) as any
    return response.data
  },
}
