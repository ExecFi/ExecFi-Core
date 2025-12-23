import crypto from "crypto"
import { query, queryOne } from "../config/database"
import { logger } from "../config/logger"
import { MessageType } from "../types"
import * as promptRouter from "./prompt-router"

interface CreateConversationInput {
  userId: string
  title?: string
}

interface CreateMessageInput {
  conversationId: string
  userId: string
  role: "user" | "assistant"
  content: string
  type?: MessageType
  metadata?: Record<string, any>
}

interface GetConversationMessagesInput {
  conversationId: string
  userId: string
  limit?: number
  offset?: number
}

export async function createConversation(input: CreateConversationInput): Promise<string> {
  try {
    const conversationId = crypto.randomUUID()
    const title = input.title || `Conversation ${new Date().toLocaleDateString()}`

    await query(`INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)`, [
      conversationId,
      input.userId,
      title,
    ])

    logger.info(`Created conversation ${conversationId} for user ${input.userId}`)
    return conversationId
  } catch (err) {
    logger.error({ error: err, userId: input.userId }, "Failed to create conversation")
    throw err
  }
}

export async function createMessage(input: CreateMessageInput): Promise<any> {
  try {
    const messageId = crypto.randomUUID()
    const messageType = input.type || MessageType.UNKNOWN

    await query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content, type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [messageId, input.conversationId, input.userId, input.role, input.content, messageType, input.metadata || {}],
    )

    logger.info(`Created message ${messageId} in conversation ${input.conversationId}`)

    return {
      id: messageId,
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role,
      content: input.content,
      type: messageType,
      createdAt: new Date(),
    }
  } catch (err) {
    logger.error({ error: err, conversationId: input.conversationId }, "Failed to create message")
    throw err
  }
}

export async function getConversationMessages(input: GetConversationMessagesInput): Promise<any[]> {
  try {
    const limit = input.limit || 50
    const offset = input.offset || 0

    // Verify user owns the conversation
    const conversation = await queryOne(`SELECT id FROM conversations WHERE id = $1 AND user_id = $2`, [
      input.conversationId,
      input.userId,
    ])

    if (!conversation) {
      throw new Error("Conversation not found or unauthorized")
    }

    const messages = await query(
      `SELECT id, conversation_id, user_id, role, content, type, metadata, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [input.conversationId, limit, offset],
    )

    return messages
  } catch (err) {
    logger.error({ error: err, conversationId: input.conversationId }, "Failed to fetch conversation messages")
    throw err
  }
}

export async function getUserConversations(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{ id: string; title: string; createdAt: Date; messageCount: number }[]> {
  try {
    const conversations = await query(
      `SELECT c.id, c.title, c.created_at, COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.title, c.created_at
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    )

    return conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      messageCount: Number(c.message_count),
    }))
  } catch (err) {
    logger.error({ error: err, userId }, "Failed to fetch user conversations")
    throw err
  }
}

export async function processUserMessage(
  conversationId: string,
  userId: string,
  userMessage: string,
  walletAddress: string,
  chain: string,
): Promise<{ userMessage: any; assistantMessage: any; actions?: any[] }> {
  try {
    // Classify the message
    const messageType = await promptRouter.classifyMessage(userMessage)

    // Create user message
    const userMsg = await createMessage({
      conversationId,
      userId,
      role: "user",
      content: userMessage,
      type: messageType,
    })

    // Get conversation context (last 10 messages)
    const messages = await query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [conversationId],
    )
    const context = messages.reverse()

    // Route to appropriate executor and generate response
    const executorResult = await promptRouter.routeToExecutor({
      messageType,
      userMessage,
      context,
      walletAddress,
      chain,
      userId,
    })

    // Create assistant response message
    const assistantMsg = await createMessage({
      conversationId,
      userId,
      role: "assistant",
      content: executorResult.response,
      type: messageType,
      metadata: {
        executorType: executorResult.executorType,
        actions: executorResult.actions,
      },
    })

    logger.info(`Processed user message in conversation ${conversationId}`)

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      actions: executorResult.actions,
    }
  } catch (err) {
    logger.error({ error: err, conversationId, userId }, "Failed to process user message")
    throw err
  }
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  try {
    // Verify user owns the conversation
    const conversation = await queryOne(`SELECT id FROM conversations WHERE id = $1 AND user_id = $2`, [
      conversationId,
      userId,
    ])

    if (!conversation) {
      throw new Error("Conversation not found or unauthorized")
    }

    await query(`DELETE FROM conversations WHERE id = $1`, [conversationId])
    logger.info(`Deleted conversation ${conversationId}`)
  } catch (err) {
    logger.error({ error: err, conversationId }, "Failed to delete conversation")
    throw err
  }
}
