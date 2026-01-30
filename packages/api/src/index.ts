import cors from 'cors'
/**
 * Markdown to HTML API Server
 */
import express from 'express'
import { authMiddleware } from './middleware/auth.js'
import renderRouter from './routes/render.js'
import themesRouter from './routes/themes.js'

const app = express()
// eslint-disable-next-line node/prefer-global/process
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Auth middleware for /api routes
app.use('/api', authMiddleware)

// Routes
app.use('/api', renderRouter)
app.use('/api', themesRouter)

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Error:', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Markdown API running on port ${PORT}`)
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`)
})

export default app
