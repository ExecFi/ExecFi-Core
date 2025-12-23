import { io } from "../server"
import { logger } from "../config/logger"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import type { JWTPayload } from "../types"

interface SocketMessage {
  conversationId: string
  content: string
}

// Socket.IO event handlers for real-time chat
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  // Authenticate socket connection
  socket.on("authenticate", (token: string) => {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload
      socket.data.user = decoded
      socket.join(`user-${decoded.userId}`)
      logger.info(`Socket ${socket.id} authenticated for user ${decoded.userId}`)
      socket.emit("authenticated", { success: true })
    } catch (err) {
      logger.error("Socket authentication failed")
      socket.emit("authenticated", { success: false, error: "Invalid token" })
      socket.disconnect()
    }
  })

  // Handle incoming chat messages
  socket.on("message", async (msg: SocketMessage) => {
    try {
      if (!socket.data.user) {
        socket.emit("error", { message: "Not authenticated" })
        return
      }

      logger.debug({ conversationId: msg.conversationId, userId: socket.data.user.userId }, "Received socket message")

      // Broadcast message to other clients in conversation
      socket.to(`conversation-${msg.conversationId}`).emit("message", {
        conversationId: msg.conversationId,
        userId: socket.data.user.userId,
        content: msg.content,
        timestamp: new Date(),
      })
    } catch (err) {
      logger.error({ error: err }, "Socket message error")
      socket.emit("error", { message: "Failed to process message" })
    }
  })

  // Join conversation room
  socket.on("join-conversation", (conversationId: string) => {
    if (socket.data.user) {
      socket.join(`conversation-${conversationId}`)
      logger.info(`Socket ${socket.id} joined conversation ${conversationId}`)
    }
  })

  // Leave conversation room
  socket.on("leave-conversation", (conversationId: string) => {
    socket.leave(`conversation-${conversationId}`)
    logger.info(`Socket ${socket.id} left conversation ${conversationId}`)
  })

  // Handle transaction status updates
  socket.on("subscribe-transaction", (transactionId: string) => {
    if (socket.data.user) {
      socket.join(`transaction-${transactionId}`)
      socket.emit("transaction-subscribed", { transactionId })
    }
  })

  // Broadcast transaction updates to subscribers
  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Function to emit transaction status updates (call from transaction service)
export function emitTransactionUpdate(transactionId: string, status: string, data: any): void {
  io.to(`transaction-${transactionId}`).emit("transaction-update", {
    transactionId,
    status,
    data,
    timestamp: new Date(),
  })
}

// Function to emit signal alerts
export function emitSignalAlert(userId: string, signal: any): void {
  io.to(`user-${userId}`).emit("signal-alert", {
    signal,
    timestamp: new Date(),
  })
}
