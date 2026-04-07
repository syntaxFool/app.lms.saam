import type { ApiResponse, AuthUser, User } from '@/types'
import { apiClient } from './api'

interface LoginCredentials {
  uid: string
  password: string
}

interface LoginResponse {
  user: AuthUser
  token: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post('/auth/login', credentials) as ApiResponse<LoginResponse>

      if (response.success && response.data) {
        localStorage.setItem('lms_auth_token', response.data.token)
        localStorage.setItem('lms_user', JSON.stringify(response.data.user))
      }

      return response.success
        ? response
        : { success: false, error: response.error || 'Authentication failed' }
    } catch (error) {
      console.error('Auth service login error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' }
    }
  },

  async validateToken(_token: string): Promise<ApiResponse<AuthUser>> {
    try {
      return await apiClient.get('/auth/validate') as ApiResponse<AuthUser>
    } catch (error) {
      console.error('Auth service token validation error:', error)
      return { success: false, error: 'Token validation failed' }
    }
  },

  async updateProfile(profileData: Partial<AuthUser>): Promise<ApiResponse<AuthUser>> {
    try {
      return await apiClient.put('/users/me', profileData) as ApiResponse<AuthUser>
    } catch (error) {
      console.error('Auth service profile update error:', error)
      return { success: false, error: 'Profile update failed' }
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post('/auth/change-password', { oldPassword, newPassword }) as ApiResponse<void>
    } catch (error) {
      console.error('Auth service change password error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to change password' }
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post('/auth/logout') as ApiResponse<void>
      localStorage.removeItem('lms_auth_token')
      localStorage.removeItem('lms_user')
      return response
    } catch (error) {
      console.error('Auth service logout error:', error)
      localStorage.removeItem('lms_auth_token')
      localStorage.removeItem('lms_user')
      return { success: true }
    }
  },

  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      return await apiClient.get('/users') as ApiResponse<User[]>
    } catch (error) {
      console.error('Auth service get users error:', error)
      return { success: false, error: 'Failed to fetch users' }
    }
  }
}