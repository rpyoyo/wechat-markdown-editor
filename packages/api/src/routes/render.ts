import type { RenderRequest } from '../types/index.js'
/**
 * Render API Route
 * POST /api/render
 */
import { Router } from 'express'
import { render } from '../services/renderer.js'

const router = Router()

router.post('/render', async (req, res) => {
  try {
    const body = req.body as RenderRequest

    if (!body.markdown) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: markdown',
      })
      return
    }

    const result = await render(
      body.markdown,
      body.themeId,
      body.format || 'wechat',
      body.options || {},
    )

    res.json({
      success: true,
      data: result,
    })
  }
  catch (error) {
    console.error('[Render] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

export default router
