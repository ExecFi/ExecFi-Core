import { generateText } from "ai"
import { getAIProvider, getModelName } from "./provider"
import { logger } from "../config/logger"
import { MessageType } from "../types"

interface ClassificationResult {
  type: MessageType
  confidence: number
  reason: string
}

export async function classifyMessageAI(userMessage: string): Promise<ClassificationResult> {
  try {
    const provider = getAIProvider()
    const model = getModelName()

    const { text } = await generateText({
      model: provider(model),
      system: `You are a message classifier for an AI trading assistant. Classify the user's message into one of these categories:
      - balance: Checking wallet balances or token holdings
      - analysis: Analyzing wallets or on-chain data
      - send: Sending tokens to another address
      - swap: Swapping one token for another
      - signal: Asking for trading signals or recommendations
      - unknown: Anything else

      Respond with ONLY a JSON object: {"type": "category", "confidence": 0-100, "reason": "brief reason"}`,
      prompt: userMessage,
    })

    const result = JSON.parse(text) as ClassificationResult
    logger.debug({ messageType: result.type, confidence: result.confidence }, "Message classified")
    return result
  } catch (err) {
    logger.error({ error: err }, "Message classification failed, defaulting to unknown")
    return {
      type: MessageType.UNKNOWN,
      confidence: 0,
      reason: "Classification error",
    }
  }
}
