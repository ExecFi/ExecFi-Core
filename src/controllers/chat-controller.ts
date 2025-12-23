import type { Response } from "express"
import { z } from "zod"
import * as chatService from "../services/chat-service"
import { AppError } from "../middlewares/error-handler"
import type { AuthRequest } from "../middlewares/auth"

const CreateConversationSchema = z.object({
  title: z.string().optional(),
})

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
})

export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const body = CreateConversationSchema.parse(req.body)
    const conversationId = await chatService.createConversation({
      userId: req.user.userId,
      title: body.title,
    })

    res.status(201).json({
      conversationId,
      message: "Conversation created",
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Invalid request body", "VALIDATION_ERROR")
    }
    throw err
  }
}

export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const limit = Number(req.query.limit) || 20
    const offset = Number(req.query.offset) || 0

    const conversations = await chatService.getUserConversations(req.user.userId, limit, offset)
    res.json({ conversations })
  } catch (err) {
    throw err
  }
}

export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const conversationId = req.params.conversationId
    const limit = Number(req.query.limit) || 50
    const offset = Number(req.query.offset) || 0

    const messages = await chatService.getConversationMessages({
      conversationId,
      userId: req.user.userId,
      limit,
      offset,
    })

    res.json({ conversationId, messages })
  } catch (err) {
    throw err
  }
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const body = SendMessageSchema.parse(req.body)
    const conversationId = req.params.conversationId

    const result = await chatService.processUserMessage(
      conversationId,
      req.user.userId,
      body.content,
      req.user.walletAddress,
      req.user.chain,
    )

    res.status(201).json({
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      actions: result.actions,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Invalid request body", "VALIDATION_ERROR")
    }
    throw err
  }
}

export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const conversationId = req.params.conversationId
    await chatService.deleteConversation(conversationId, req.user.userId)

    res.json({ message: "Conversation deleted" })
  } catch (err) {
    throw err
  }
}
