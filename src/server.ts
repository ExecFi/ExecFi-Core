import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import createApp from "./app"
import { env } from "./config/env"
import { logger } from "./config/logger"
import { pool } from "./config/database"
import { redis } from "./config/redis"

const app = createApp()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
})

// Export io for use in routes/sockets
export { io }

// Socket.IO connection handler
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
  httpServer.close(async () => {
    logger.info("HTTP server closed")
    await pool.end()
    logger.info("Database pool closed")
    redis.disconnect()
    logger.info("Redis disconnected")
    process.exit(0)
  })

  setTimeout(() => {
    logger.error("Forced shutdown after 10 seconds")
    process.exit(1)
  }, 10000)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

// Start server
httpServer.listen(env.PORT, env.HOST, () => {
  logger.info(`ExecFi backend running on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`)
})
