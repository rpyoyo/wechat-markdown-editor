/**
 * API Types
 */

export interface ThemeMetadata {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface RenderRequest {
  markdown: string
  themeId?: string
  format?: 'wechat' | 'html' | 'html-plain'
  options?: RenderOptions
}

export interface RenderOptions {
  citeStatus?: boolean
  countStatus?: boolean
  isMacCodeBlock?: boolean
  isShowLineNumber?: boolean
  legend?: string
  codeTheme?: 'github' | 'github-dark' | 'vs' | 'vs2015' | 'atom-one-dark' | 'atom-one-light'
}

export interface RenderResponse {
  success: boolean
  data?: {
    html: string
    css?: string
    readingTime: {
      chars: number
      words: number
      minutes: number
    }
  }
  error?: string
}

export interface ThemesResponse {
  success: boolean
  data?: ThemeMetadata[]
  error?: string
}

export interface ThemeUploadResponse {
  success: boolean
  data?: ThemeMetadata
  error?: string
}
