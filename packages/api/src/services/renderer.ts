import type { RenderOptions } from '../types/index.js'
import hljs from 'highlight.js'
import DOMPurify from 'isomorphic-dompurify'
import juice from 'juice'
/**
 * Markdown Renderer Service
 * Standalone renderer using marked directly (no @md/core dependency)
 */
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import { BASE_WECHAT_CSS } from './baseStyles.js'
import { getCodeThemeCSS } from './codeThemes.js'
import { getTheme } from './themeStore.js'

interface RenderResult {
  html: string
  css?: string
  readingTime: {
    chars: number
    words: number
    minutes: number
  }
}

// Minimal default theme CSS
const DEFAULT_THEME_CSS = `
:root {
  --md-primary-color: #0F4C81;
  --md-font-family: -apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif;
  --md-font-size: 16px;
}

.md-container { font-family: var(--md-font-family); font-size: var(--md-font-size); line-height: 1.8; color: #333; }
h1, h2, h3, h4, h5, h6 { font-weight: bold; color: inherit; margin: 1.5em 0 0.5em; }
h1 { font-size: 1.6em; border-bottom: 2px solid var(--md-primary-color); display: table; margin: 2em auto 1em; padding: 0 1em; }
h2 { font-size: 1.4em; background: var(--md-primary-color); color: #fff; display: table; margin: 2em auto 1em; padding: 0.2em 0.5em; }
h3 { font-size: 1.2em; border-left: 3px solid var(--md-primary-color); padding-left: 8px; }
p { margin: 1em 0; }
blockquote { border-left: 4px solid var(--md-primary-color); padding: 1em; margin: 1em 0; background: rgba(0,0,0,0.03); }
blockquote p { margin: 0; }
code { background: rgba(27,31,35,0.05); padding: 2px 5px; border-radius: 3px; font-size: 90%; color: #d14; }
pre { background: #f6f8fa; padding: 1em; border-radius: 6px; overflow-x: auto; line-height: 1.5; }
pre code { background: none; padding: 0; color: inherit; }
a { color: #576b95; text-decoration: none; }
strong { color: var(--md-primary-color); font-weight: bold; }
ul, ol { padding-left: 1.5em; margin: 1em 0; }
li { margin: 0.3em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ddd; padding: 8px; }
th { background: #f6f8fa; font-weight: bold; }
img { max-width: 100%; display: block; margin: 1em auto; border-radius: 4px; }
hr { border: none; border-top: 2px solid #eee; margin: 2em 0; }
`

// Calculate reading time
function calculateReadingTime(text: string) {
  const wordsPerMinute = 200
  const words = text.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return { chars: text.length, words, minutes }
}
// Mac code block SVG (red, yellow, green dots)
const macCodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130"><ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" /><ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" /><ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" /></svg>`

// Create marked instance with highlight.js
function createMarkedInstance(options: RenderOptions) {
  const marked = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      },
    }),
  )

  // Configure options
  marked.setOptions({
    gfm: true,
    breaks: true,
  })

  // Custom code block renderer for Mac style
  if (options.isMacCodeBlock) {
    marked.use({
      renderer: {
        code({ text, lang }) {
          const language = hljs.getLanguage(lang || '') ? lang : 'plaintext'
          const highlighted = hljs.highlight(text, { language: language || 'plaintext' }).value
          // Mac sign should be in pre but outside code, as a header element
          const macSign = `<span class="mac-sign" style="display: flex; padding: 10px 14px 6px; margin-bottom: 0;">${macCodeSvg}</span>`
          return `<pre class="hljs code__pre" style="font-size: 90%; overflow-x: auto; border-radius: 8px; padding: 0; line-height: 1.5; margin: 10px 8px;">${macSign}<code class="language-${lang || 'plaintext'}" style="display: block; padding: 0 1em 1em; overflow-x: auto; color: inherit; background: none; white-space: pre;">${highlighted}</code></pre>`
        },
      },
    })
  }

  return marked
}

/**
 * Render Markdown to HTML with optional theme
 */
export async function render(
  markdown: string,
  themeId?: string,
  format: 'wechat' | 'html' | 'html-plain' = 'wechat',
  options: RenderOptions = {},
): Promise<RenderResult> {
  const marked = createMarkedInstance(options)

  // Render markdown to HTML
  const rawHtml = await marked.parse(markdown)

  // Sanitize HTML
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['section'],
    ADD_ATTR: ['class', 'id', 'style'],
  })

  // Wrap in container
  let html = `<section class="md-container">${sanitizedHtml}</section>`

  // Calculate reading time
  const readingTime = calculateReadingTime(markdown)

  // Get theme CSS
  let themeCSS = DEFAULT_THEME_CSS

  if (themeId) {
    const theme = await getTheme(themeId)
    if (theme) {
      themeCSS = theme.css
    }
  }

  // Prepend base styles for WeChat compatibility (ensures list-item display, etc.)
  const combinedCSS = `${BASE_WECHAT_CSS}\n${themeCSS}`

  // Process CSS - replace variables with actual values
  let processedCSS = processCSS(combinedCSS)

  // Add code highlight theme CSS if specified
  if (options.codeTheme) {
    const codeThemeCSS = getCodeThemeCSS(options.codeTheme)
    processedCSS = `${processedCSS}\n${codeThemeCSS}`
  }
  else {
    // Default to github-dark if not specified
    const codeThemeCSS = getCodeThemeCSS('github-dark')
    processedCSS = `${processedCSS}\n${codeThemeCSS}`
  }

  // Format-specific handling
  let css: string | undefined

  if (format === 'html-plain') {
    // Return CSS separately
    css = processedCSS
  }
  else if (format === 'wechat') {
    // WeChat format: inline all CSS into style attributes
    html = inlineCSS(html, processedCSS)
  }
  else {
    // html format: embed CSS in style tag
    html = `<style>${processedCSS}</style>\n${html}`
  }

  return { html, css, readingTime }
}

/**
 * Inline CSS into HTML elements using juice
 * This is required for WeChat which doesn't support <style> tags
 */
function inlineCSS(html: string, css: string): string {
  try {
    // Create a full HTML document for juice to process
    const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`

    const result = juice(fullHtml, {
      removeStyleTags: true,
      preserveImportant: true,
      inlinePseudoElements: false,
    })

    // Extract just the body content
    const bodyMatch = result.match(/<body>([\s\S]*)<\/body>/i)
    return bodyMatch ? bodyMatch[1].trim() : html
  }
  catch (error) {
    console.error('[Renderer] Failed to inline CSS:', error)
    // Fallback: return HTML with embedded style tag
    return `<style>${css}</style>\n${html}`
  }
}

/**
 * Process CSS - replace variables with values for WeChat compatibility
 * WeChat doesn't support CSS variables, so we need to inline them
 */
function processCSS(css: string): string {
  // Extract CSS variables from :root (handle multi-line with [\s\S])
  const variables: Record<string, string> = {}

  // Match :root block - use [\s\S] instead of [^}] to handle multi-line content
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/i)

  if (rootMatch) {
    const rootContent = rootMatch[1]
    // Match variable definitions: --name: value;
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g
    let match = varRegex.exec(rootContent)
    while (match !== null) {
      const varName = match[1].trim()
      const varValue = match[2].trim()
      variables[varName] = varValue
      match = varRegex.exec(rootContent)
    }
  }

  // Replace var() references with actual values
  let processed = css
  for (const [varName, varValue] of Object.entries(variables)) {
    // Escape special regex characters in variable name (the -- prefix)
    const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match var(--name) with optional whitespace
    const regex = new RegExp(`var\\(\\s*${escapedName}\\s*\\)`, 'g')
    processed = processed.replace(regex, varValue)
  }

  // Inject base styles for .md-container if variables are defined but not used
  // This ensures font-family and font-size from :root are applied
  const fontFamily = variables['--md-font-family']
  const fontSize = variables['--md-font-size']
  // const primaryColor = variables['--md-primary-color']

  if (fontFamily || fontSize) {
    const baseStyles: string[] = []
    if (fontFamily)
      baseStyles.push(`font-family: ${fontFamily}`)
    if (fontSize)
      baseStyles.push(`font-size: ${fontSize}`)
    baseStyles.push('line-height: 1.8')
    baseStyles.push('color: hsl(0, 0%, 3.9%)')

    // Add or update .md-container styles
    const containerRule = `.md-container { ${baseStyles.join('; ')}; }\n`
    processed = containerRule + processed
  }

  // Remove :root block as it's no longer needed and not supported in WeChat
  processed = processed.replace(/:root\s*\{[\s\S]*?\}/gi, '')

  // Fix list markers: theme sets li { display: block } which hides bullets/numbers
  // Replace with display: list-item to show list markers
  processed = processed.replace(/display\s*:\s*block/gi, (match, offset) => {
    // Check if this is inside a li rule (look back for 'li {' pattern)
    const before = processed.substring(Math.max(0, offset - 50), offset)
    if (/li\s*\{[^}]*$/i.test(before)) {
      return 'display: list-item'
    }
    return match
  })

  // Handle special patterns that are common in themes
  // Use actual values from apps/web/src/assets/index.css
  // --foreground: 0 0% 3.9%; -> hsl(0, 0%, 3.9%) is nearly black
  processed = processed.replace(/hsl\s*\(\s*var\s*\(\s*--foreground\s*\)\s*\)/gi, 'hsl(0, 0%, 3.9%)')
  // --background: 0 0% 100%; -> white
  processed = processed.replace(/hsl\s*\(\s*var\s*\(\s*--background\s*\)\s*\)/gi, 'hsl(0, 0%, 100%)')
  // var(--blockquote-background) -> subtle gray
  processed = processed.replace(/var\s*\(\s*--blockquote-background\s*\)/gi, 'rgba(0,0,0,0.03)')
  // var(--foreground) -> nearly black
  processed = processed.replace(/var\s*\(\s*--foreground\s*\)/gi, '0 0% 3.9%')
  // var(--background) -> white
  processed = processed.replace(/var\s*\(\s*--background\s*\)/gi, '0 0% 100%')

  // Handle any remaining var() fallbacks
  processed = processed.replace(/var\(--[\w-]+\)/g, 'inherit')

  return processed
}
