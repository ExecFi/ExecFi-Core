import { generateText } from "ai"
import { getAIProvider, getModelName } from "./provider"
import { SYSTEM_PROMPTS } from "./system-prompts"
import { logger } from "../config/logger"
import type { MessageType } from "../types"

interface GenerateResponseInput {
  messageType: MessageType
  userMessage: string
  context: any[]
  walletAddress: string
  chain: string
}

interface GeneratedResponse {
  response: string
  suggestions?: string[]
  requiresConfirmation?: boolean
}

export async function generateResponse(input: GenerateResponseInput): Promise<GeneratedResponse> {
  try {
    const provider = getAIProvider()
    const model = getModelName()
    const systemPrompt = SYSTEM_PROMPTS[input.messageType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.base

    // Build context from conversation history
    const contextText = input.context.map((msg) => `${msg.role}: ${msg.content}`).join("\n")

    const prompt = `User's wallet: ${input.walletAddress} on ${input.chain}

Conversation context:
${contextText}

User: ${input.userMessage}`

    const { text } = await generateText({
      model: provider(model),
      system: systemPrompt,
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    logger.debug({ messageType: input.messageType }, "Response generated")

    return {
      response: text,
      requiresConfirmation: ["send", "swap"].includes(input.messageType),
    }
  } catch (err) {
    logger.error({ error: err, messageType: input.messageType }, "Response generation failed")
    throw err
  }
}
