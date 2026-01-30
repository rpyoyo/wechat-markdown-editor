/**
 * API Theme Composable
 * Handles API calls for theme management
 */
import { useApiConfigStore } from '@/stores/apiConfig'

interface ThemeMetadata {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function useApiTheme() {
  const apiConfig = useApiConfigStore()

  async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    if (!apiConfig.isConfigured.value) {
      return { success: false, error: '请先配置 API 端点和密钥' }
    }

    const url = `${apiConfig.endpoint.value}${path}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': apiConfig.apiKey.value,
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
        }
      }

      // Check if response is CSS (download theme)
      const contentType = response.headers.get('Content-Type')
      if (contentType?.includes('text/css')) {
        const css = await response.text()
        return { success: true, data: css as T }
      }

      return await response.json()
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      }
    }
  }

  /**
   * Upload theme CSS to API
   */
  async function uploadTheme(name: string, cssContent: string): Promise<ApiResponse<ThemeMetadata>> {
    const formData = new FormData()
    const blob = new Blob([cssContent], { type: 'text/css' })
    formData.append('file', blob, `${name}.css`)
    formData.append('name', name)

    return apiRequest<ThemeMetadata>('/api/themes', {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * List all themes from API
   */
  async function listThemes(): Promise<ApiResponse<ThemeMetadata[]>> {
    return apiRequest<ThemeMetadata[]>('/api/themes')
  }

  /**
   * Download theme CSS from API
   */
  async function downloadTheme(id: string): Promise<ApiResponse<string>> {
    return apiRequest<string>(`/api/themes/${id}`)
  }

  /**
   * Delete theme from API
   */
  async function deleteTheme(id: string): Promise<ApiResponse<{ id: string, deleted: boolean }>> {
    return apiRequest<{ id: string, deleted: boolean }>(`/api/themes/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Test API connection - fixed to properly check health response
   */
  async function testConnection(): Promise<boolean> {
    if (!apiConfig.isConfigured.value) {
      return false
    }

    const url = `${apiConfig.endpoint.value}/api/health`

    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiConfig.apiKey.value,
        },
      })

      if (!response.ok) {
        return false
      }

      // Health check returns {status: "ok", timestamp: "..."}
      const data = await response.json()
      return data.status === 'ok'
    }
    catch {
      return false
    }
  }

  return {
    uploadTheme,
    listThemes,
    downloadTheme,
    deleteTheme,
    testConnection,
  }
}
