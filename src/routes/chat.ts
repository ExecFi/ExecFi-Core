import express from "express"
import { authMiddleware, type AuthRequest } from "../middlewares/auth"
import * as chatController from "../controllers/chat-controller"

const router = express.Router()

// Protected routes
router.post("/conversations", authMiddleware, async (req, res, next) => {
  try {
    await chatController.createConversation(req as AuthRequest, res)
  } catch (err) {
    next(err)
  }
})

router.get("/conversations", authMiddleware, async (req, res, next) => {
  try {
    await chatController.listConversations(req as AuthRequest, res)
  } catch (err) {
    next(err)
  }
})

router.get("/conversations/:conversationId", authMiddleware, async (req, res, next) => {
  try {
    await chatController.getConversation(req as AuthRequest, res)
  } catch (err) {
    next(err)
  }
})

router.post("/conversations/:conversationId/messages", authMiddleware, async (req, res, next) => {
  try {
    await chatController.sendMessage(req as AuthRequest, res)
  } catch (err) {
    next(err)
  }
})

router.delete("/conversations/:conversationId", authMiddleware, async (req, res, next) => {
  try {
    await chatController.deleteConversation(req as AuthRequest, res)
  } catch (err) {
    next(err)
  }
})

export default router
