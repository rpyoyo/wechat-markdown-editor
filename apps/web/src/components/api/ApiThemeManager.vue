<script setup lang="ts">
/**
 * API Theme Manager Component
 * Low-intrusion component for managing themes via API
 */
import { Cloud, CloudOff, Copy, Download, FileUp, RefreshCw, Settings, Trash2 } from 'lucide-vue-next'
import { useApiTheme } from '@/composables/useApiTheme'
import { useApiConfigStore } from '@/stores/apiConfig'
import { useCssEditorStore } from '@/stores/cssEditor'

interface ThemeItem {
  id: string
  name: string
  createdAt: string
}

const apiConfig = useApiConfigStore()
const apiTheme = useApiTheme()
const cssEditorStore = useCssEditorStore()

// Dialog states
const isOpen = ref(false)
const isConfigOpen = ref(false)
const isLoading = ref(false)

// Config form
const configEndpoint = ref('')
const configApiKey = ref('')

// Theme list
const themes = ref<ThemeItem[]>([])

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// Initialize config form when dialog opens
watch(isConfigOpen, (open) => {
  if (open) {
    configEndpoint.value = apiConfig.endpoint.value
    configApiKey.value = apiConfig.apiKey.value
  }
})

// Load themes when main dialog opens
watch(isOpen, async (open) => {
  if (open && apiConfig.isConfigured.value) {
    await loadThemes()
  }
})

async function loadThemes() {
  isLoading.value = true
  try {
    const result = await apiTheme.listThemes()
    if (result.success && result.data) {
      themes.value = result.data
    }
    else {
      toast.error(result.error || '加载主题列表失败')
    }
  }
  finally {
    isLoading.value = false
  }
}

async function saveConfig() {
  if (!configEndpoint.value || !configApiKey.value) {
    toast.error('请填写完整的配置信息')
    return
  }

  apiConfig.setConfig(configEndpoint.value, configApiKey.value)

  // Test connection
  isLoading.value = true
  try {
    const connected = await apiTheme.testConnection()
    if (connected) {
      toast.success('API 连接成功')
      isConfigOpen.value = false
      await loadThemes()
    }
    else {
      toast.error('API 连接失败，请检查配置')
    }
  }
  finally {
    isLoading.value = false
  }
}

/**
 * Trigger file input for importing local CSS file
 */
function triggerFileImport() {
  fileInputRef.value?.click()
}

/**
 * Handle file selection and upload to API
 */
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file)
    return

  // Validate file type
  if (!file.name.endsWith('.css')) {
    toast.error('请选择 CSS 文件')
    input.value = ''
    return
  }

  isLoading.value = true
  try {
    const cssContent = await file.text()
    const themeName = file.name.replace('.css', '')

    // Upload to API
    const result = await apiTheme.uploadTheme(themeName, cssContent)

    if (result.success && result.data) {
      toast.success(`主题 "${themeName}" 上传成功，ID: ${result.data.id}`)
      await loadThemes()
    }
    else {
      toast.error(result.error || '上传失败')
    }
  }
  catch (e) {
    console.log(e)
    toast.error('读取文件失败')
  }
  finally {
    isLoading.value = false
    input.value = '' // Reset input
  }
}

/**
 * Download theme and create new CSS tab in editor
 */
async function downloadTheme(theme: ThemeItem) {
  isLoading.value = true
  try {
    const result = await apiTheme.downloadTheme(theme.id)
    if (result.success && result.data) {
      // Generate unique tab name
      const tabName = `API-${theme.name}`

      // Check if tab name already exists
      const exists = !cssEditorStore.validatorTabName(tabName)
      const finalName = exists ? `${tabName}-${Date.now()}` : tabName

      // Create a new CSS tab with the downloaded content
      cssEditorStore.addCssContentTab(finalName, result.data)

      toast.success(`主题 "${theme.name}" 已导入到配置方案 "${finalName}"`)
      isOpen.value = false
    }
    else {
      toast.error(result.error || '下载失败')
    }
  }
  finally {
    isLoading.value = false
  }
}

/**
 * Copy theme ID to clipboard
 */
function copyThemeId(theme: ThemeItem) {
  navigator.clipboard.writeText(theme.id)
  toast.success(`已复制主题 ID: ${theme.id}`)
}

async function removeTheme(theme: ThemeItem) {
  // eslint-disable-next-line no-alert
  if (!confirm(`确定要删除主题 "${theme.name}" 吗？`)) {
    return
  }

  isLoading.value = true
  try {
    const result = await apiTheme.deleteTheme(theme.id)
    if (result.success) {
      toast.success(`主题 "${theme.name}" 已删除`)
      await loadThemes()
    }
    else {
      toast.error(result.error || '删除失败')
    }
  }
  finally {
    isLoading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <!-- Hidden file input -->
  <input
    ref="fileInputRef"
    type="file"
    accept=".css"
    class="hidden"
    @change="handleFileSelect"
  >

  <!-- Floating button -->
  <Button
    v-show="true"
    class="fixed z-100 shadow-lg hover:bg-accent cursor-pointer transition-shadow bg-background text-background-foreground border bottom-34 right-4"
    size="sm"
    variant="outline"
    @click="isOpen = true"
  >
    <Cloud v-if="apiConfig.isConfigured.value" class="h-4 w-4 mr-2" />
    <CloudOff v-else class="h-4 w-4 mr-2" />
    API 主题
  </Button>

  <!-- Main dialog -->
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Cloud class="h-5 w-5" />
          API 主题管理
        </DialogTitle>
        <DialogDescription>
          从本地导入主题到 API 服务器，或从服务器下载主题到编辑器
        </DialogDescription>
      </DialogHeader>

      <!-- Not configured state -->
      <div v-if="!apiConfig.isConfigured.value" class="py-8 text-center">
        <CloudOff class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-muted-foreground mb-4">
          尚未配置 API 连接
        </p>
        <Button @click="isConfigOpen = true">
          <Settings class="h-4 w-4 mr-2" />
          配置 API
        </Button>
      </div>

      <!-- Configured state -->
      <div v-else class="space-y-4">
        <!-- Actions -->
        <div class="flex gap-2">
          <Button
            class="flex-1"
            :disabled="isLoading"
            @click="triggerFileImport"
          >
            <FileUp class="h-4 w-4 mr-2" />
            导入本地主题
          </Button>
          <Button
            variant="outline"
            size="icon"
            :disabled="isLoading"
            @click="loadThemes"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            @click="isConfigOpen = true"
          >
            <Settings class="h-4 w-4" />
          </Button>
        </div>

        <!-- Theme list -->
        <div class="border rounded-lg max-h-72 overflow-y-auto">
          <div v-if="themes.length === 0" class="p-4 text-center text-muted-foreground">
            暂无主题，点击上方按钮导入本地 CSS 文件
          </div>
          <div
            v-for="theme in themes"
            :key="theme.id"
            class="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
          >
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">
                {{ theme.name }}
              </p>
              <p class="text-xs text-muted-foreground font-mono">
                ID: {{ theme.id }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ formatDate(theme.createdAt) }}
              </p>
            </div>
            <div class="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :disabled="isLoading"
                title="复制主题 ID"
                @click="copyThemeId(theme)"
              >
                <Copy class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :disabled="isLoading"
                title="下载到本地编辑器"
                @click="downloadTheme(theme)"
              >
                <Download class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-destructive hover:text-destructive"
                :disabled="isLoading"
                title="删除"
                @click="removeTheme(theme)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <p class="text-xs text-muted-foreground">
          提示：点击复制按钮获取主题 ID 用于 API 调用，点击下载按钮导入到编辑器配置方案
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="isOpen = false">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Config dialog -->
  <Dialog v-model:open="isConfigOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          配置 API 连接
        </DialogTitle>
        <DialogDescription>
          输入 API 服务器地址和密钥
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">API 端点</label>
          <Input
            v-model="configEndpoint"
            placeholder="http://localhost:3000"
          />
          <p class="text-xs text-muted-foreground">
            例如: http://localhost:3000 或 https://api.example.com
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">API 密钥</label>
          <Input
            v-model="configApiKey"
            type="password"
            placeholder="输入 API Key"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="isConfigOpen = false">
          取消
        </Button>
        <Button :disabled="isLoading" @click="saveConfig">
          <RefreshCw v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
          保存并测试
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
