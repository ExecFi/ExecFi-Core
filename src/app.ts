import express from "express"
import cors from "cors"
import { env } from "./config/env"
import { errorHandler } from "./middlewares/error-handler"
import { rateLimitMiddleware } from "./middlewares/rate-limit"

// Import routes (we'll create these next)
// import authRoutes from './routes/auth';
// import chatRoutes from './routes/chat';
// import transactionRoutes from './routes/transactions';

export function createApp() {
  const app = express()

  // Middleware
  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json())
  app.use(rateLimitMiddleware)

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  })

  // Auth routes (public)
  // app.use('/api/auth', authRoutes);

  // Protected routes
  // app.use('/api/chat', authMiddleware, chatRoutes);
  // app.use('/api/transactions', authMiddleware, transactionRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}

export default createApp
