/**
 * API Configuration Store
 * Stores API endpoint and authentication settings
 */
import { computed, ref, watch } from 'vue'

// Use localStorage for persistence
function getStoredValue(key: string, defaultValue: string): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key) || defaultValue
  }
  return defaultValue
}

function setStoredValue(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value)
  }
}

const endpoint = ref(getStoredValue('api_endpoint', ''))
const apiKey = ref(getStoredValue('api_key', ''))

// Watch for changes and persist
watch(endpoint, val => setStoredValue('api_endpoint', val))
watch(apiKey, val => setStoredValue('api_key', val))

export function useApiConfigStore() {
  const isConfigured = computed(() => {
    return endpoint.value.length > 0 && apiKey.value.length > 0
  })

  function setConfig(newEndpoint: string, newApiKey: string) {
    endpoint.value = newEndpoint
    apiKey.value = newApiKey
  }

  function clearConfig() {
    endpoint.value = ''
    apiKey.value = ''
  }

  return {
    endpoint,
    apiKey,
    isConfigured,
    setConfig,
    clearConfig,
  }
}
