import type { ThemeMetadata } from '../types/index.js'
import { existsSync } from 'node:fs'
/**
 * Theme Storage Service
 * Manages CSS theme files on disk
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'

// Calculate __dirname for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get themes directory (Docker uses /app/themes, dev uses relative path)
function getThemesDir(): string {
  const dockerPath = '/app/themes'
  const devPath = path.resolve(__dirname, '..', '..', 'themes')

  // In Docker, __dirname is /app/dist, so check if we're in that context
  if (__dirname.startsWith('/app/') && existsSync('/app')) {
    console.log(`[ThemeStore] Using Docker themes path: ${dockerPath}`)
    return dockerPath
  }
  console.log(`[ThemeStore] Using dev themes path: ${devPath}`)
  return devPath
}

const THEMES_DIR = getThemesDir()
const METADATA_FILE = path.join(THEMES_DIR, 'metadata.json')

// Log path for debugging
console.log(`[ThemeStore] Themes directory: ${THEMES_DIR}`)
console.log(`[ThemeStore] Directory exists: ${existsSync(THEMES_DIR)}`)

// Ensure themes directory exists
async function ensureThemesDir() {
  try {
    await fs.access(THEMES_DIR)
  }
  catch {
    await fs.mkdir(THEMES_DIR, { recursive: true })
    console.log(`[ThemeStore] Created themes directory: ${THEMES_DIR}`)
  }
}

// Load metadata
async function loadMetadata(): Promise<Record<string, ThemeMetadata>> {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8')
    return JSON.parse(data)
  }
  catch (e) {
    console.log(`[ThemeStore] No metadata file found, returning empty`, e)
    return {}
  }
}

// Save metadata
async function saveMetadata(metadata: Record<string, ThemeMetadata>) {
  await ensureThemesDir()
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2))
}

/**
 * Save a theme CSS file
 */
export async function saveTheme(name: string, cssContent: string): Promise<ThemeMetadata> {
  await ensureThemesDir()

  const id = `theme_${nanoid(8)}`
  const now = new Date().toISOString()

  const metadata: ThemeMetadata = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  }

  // Save CSS file
  const cssPath = path.join(THEMES_DIR, `${id}.css`)
  await fs.writeFile(cssPath, cssContent, 'utf-8')
  console.log(`[ThemeStore] Saved theme: ${cssPath}`)

  // Update metadata
  const allMetadata = await loadMetadata()
  allMetadata[id] = metadata
  await saveMetadata(allMetadata)

  return metadata
}

/**
 * Get all themes metadata
 */
export async function listThemes(): Promise<ThemeMetadata[]> {
  const metadata = await loadMetadata()
  return Object.values(metadata).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/**
 * Get a theme by ID
 */
export async function getTheme(id: string): Promise<{ metadata: ThemeMetadata, css: string } | null> {
  console.log(`[ThemeStore] Getting theme: ${id}`)

  const allMetadata = await loadMetadata()
  const metadata = allMetadata[id]

  if (!metadata) {
    console.log(`[ThemeStore] Theme ${id} not found in metadata`)
    return null
  }

  const cssPath = path.join(THEMES_DIR, `${id}.css`)
  console.log(`[ThemeStore] CSS path: ${cssPath}`)
  console.log(`[ThemeStore] File exists: ${existsSync(cssPath)}`)

  try {
    const css = await fs.readFile(cssPath, 'utf-8')
    console.log(`[ThemeStore] Successfully read CSS (${css.length} bytes)`)
    return { metadata, css }
  }
  catch (error) {
    console.error(`[ThemeStore] Failed to read CSS:`, error)
    return null
  }
}

/**
 * Delete a theme
 */
export async function deleteTheme(id: string): Promise<boolean> {
  const allMetadata = await loadMetadata()

  if (!allMetadata[id]) {
    return false
  }

  // Delete CSS file
  try {
    const cssPath = path.join(THEMES_DIR, `${id}.css`)
    await fs.unlink(cssPath)
  }
  catch {
    // File might not exist, continue
  }

  // Remove from metadata
  delete allMetadata[id]
  await saveMetadata(allMetadata)

  return true
}

/**
 * Check if a theme exists
 */
export async function themeExists(id: string): Promise<boolean> {
  const allMetadata = await loadMetadata()
  return id in allMetadata
}
