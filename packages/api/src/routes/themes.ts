/**
 * Themes API Route
 * CRUD for theme CSS files
 */
import { Router } from 'express'
import multer from 'multer'
import * as themeStore from '../services/themeStore.js'

const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/css' || file.originalname.endsWith('.css')) {
      cb(null, true)
    }
    else {
      cb(new Error('Only CSS files are allowed'))
    }
  },
})

/**
 * GET /api/themes - List all themes
 */
router.get('/themes', async (_req, res) => {
  try {
    const themes = await themeStore.listThemes()
    res.json({
      success: true,
      data: themes,
    })
  }
  catch (error) {
    console.error('[Themes] List error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list themes',
    })
  }
})

/**
 * POST /api/themes - Upload a new theme
 */
router.post('/themes', upload.single('file'), async (req, res) => {
  try {
    const file = req.file

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No CSS file uploaded. Use multipart/form-data with field name "file".',
      })
      return
    }

    const cssContent = file.buffer.toString('utf-8')
    const name = (req.body.name as string) || file.originalname.replace(/\.css$/, '')

    const metadata = await themeStore.saveTheme(name, cssContent)

    res.status(201).json({
      success: true,
      data: metadata,
    })
  }
  catch (error) {
    console.error('[Themes] Upload error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload theme',
    })
  }
})

/**
 * GET /api/themes/:id - Get a specific theme
 */
router.get('/themes/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log(`[Themes] Getting theme: ${id}`)

    const theme = await themeStore.getTheme(id)
    console.log(`[Themes] Theme result:`, theme ? 'found' : 'not found')

    if (!theme) {
      res.status(404).json({
        success: false,
        error: 'Theme not found',
      })
      return
    }

    // Return CSS content with appropriate headers
    // Use RFC 5987 encoding for non-ASCII filenames
    const encodedFilename = encodeURIComponent(theme.metadata.name).replace(/'/g, '%27')
    res.setHeader('Content-Type', 'text/css; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}.css`)
    res.send(theme.css)
  }
  catch (error) {
    console.error('[Themes] Get error:', error)
    console.error('[Themes] Error stack:', error instanceof Error ? error.stack : 'no stack')
    res.status(500).json({
      success: false,
      error: 'Failed to get theme',
    })
  }
})

/**
 * DELETE /api/themes/:id - Delete a theme
 */
router.delete('/themes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await themeStore.deleteTheme(id)

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Theme not found',
      })
      return
    }

    res.json({
      success: true,
      data: { id, deleted: true },
    })
  }
  catch (error) {
    console.error('[Themes] Delete error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete theme',
    })
  }
})

export default router
