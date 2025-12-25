import express from "express"
import cors from "cors"
import { env } from "./config/env.js"
import { errorHandler } from "./middlewares/error-handler.js"
import { rateLimitMiddleware } from "./middlewares/rate-limit.js"
import authRoutes from "./routes/auth.js"
import chatRoutes from "./routes/chat.js"
import x402Routes from "./routes/x402.js"
import gmgnRoutes from "./routes/gmgn.js"
import polymarketRoutes from "./routes/polymarket.js"
import { authMiddleware } from "./middlewares/auth.js"

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

  app.use("/api/auth", authRoutes)

  app.use("/api/chat", authMiddleware, chatRoutes)
  app.use("/api/x402", authMiddleware, x402Routes)
  app.use("/api/gmgn", authMiddleware, gmgnRoutes)
  app.use("/api/polymarket", authMiddleware, polymarketRoutes)

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}

export default createApp
