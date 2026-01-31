/**
 * API Key Authentication Middleware
 * Reads API keys from config.json file
 */
import type { NextFunction, Request, Response } from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try multiple config paths (Docker mounts to /app/config/, dev uses relative path)
function getConfigPath(): string {
  const dockerPath = '/app/config/config.json'
  const devPath = join(__dirname, '../../config.json')

  if (existsSync(dockerPath)) {
    console.log('[Auth] Using Docker config path:', dockerPath)
    return dockerPath
  }
  console.log('[Auth] Using dev config path:', devPath)
  return devPath
}

const configPath = getConfigPath()

// Load API keys from config file
function loadApiKeys(): Set<string> {
  console.log('[Auth] Loading API keys from:', configPath)
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      const keys = config.apiKeys || []
      const validKeys = keys.filter((k: string) => k && k !== 'your-api-key-here')
      console.log('[Auth] Loaded', validKeys.length, 'valid API key(s)')
      return new Set(validKeys)
    }
    console.warn('[Auth] Config file not found:', configPath)
  }
  catch (err) {
    console.warn('[Auth] Failed to load config.json:', err)
  }
  return new Set()
}

let validKeys = loadApiKeys()

// Reload config periodically (every 60 seconds)
setInterval(() => {
  validKeys = loadApiKeys()
}, 60000)

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Missing API key. Please provide X-API-Key header.',
    })
    return
  }

  // If no keys configured, allow any key (development mode)
  if (validKeys.size === 0) {
    console.warn('[Auth] No API keys configured in config.json - accepting any key')
    return next()
  }

  if (!validKeys.has(apiKey)) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key.',
    })
    return
  }

  next()
}
