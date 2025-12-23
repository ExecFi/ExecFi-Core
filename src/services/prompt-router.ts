import { MessageType, type Chain } from "../types"
import { logger } from "../config/logger"
import * as analyzeExecutor from "./executors/analyze-executor"
import * as sendExecutor from "./executors/send-executor"
import * as swapExecutor from "./executors/swap-executor"
import * as signalExecutor from "./executors/signal-executor"

// Simple keyword-based classifier (in production, use AI for this)
export async function classifyMessage(message: string): Promise<MessageType> {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes("balance") || lowerMessage.includes("how much")) {
    return MessageType.BALANCE
  }

  if (
    lowerMessage.includes("swap") ||
    lowerMessage.includes("exchange") ||
    lowerMessage.includes("trade") ||
    lowerMessage.includes("convert")
  ) {
    return MessageType.SWAP
  }

  if (
    lowerMessage.includes("send") ||
    lowerMessage.includes("transfer") ||
    lowerMessage.includes("pay") ||
    lowerMessage.includes("mint")
  ) {
    return MessageType.SEND
  }

  if (
    lowerMessage.includes("signal") ||
    lowerMessage.includes("buy") ||
    lowerMessage.includes("sell") ||
    lowerMessage.includes("hold") ||
    lowerMessage.includes("analyze")
  ) {
    return MessageType.SIGNAL
  }

  if (lowerMessage.includes("analyze") || lowerMessage.includes("analysis")) {
    return MessageType.ANALYSIS
  }

  return MessageType.UNKNOWN
}

interface RoutingContext {
  messageType: MessageType
  userMessage: string
  context: any[]
  walletAddress: string
  chain: Chain
  userId: string
}

interface ExecutorResult {
  response: string
  executorType: string
  actions?: any[]
}

export async function routeToExecutor(routing: RoutingContext): Promise<ExecutorResult> {
  try {
    switch (routing.messageType) {
      case MessageType.ANALYSIS:
        return await analyzeExecutor.execute({
          userMessage: routing.userMessage,
          walletAddress: routing.walletAddress,
          chain: routing.chain,
          userId: routing.userId,
        })

      case MessageType.SEND:
        return await sendExecutor.execute({
          userMessage: routing.userMessage,
          walletAddress: routing.walletAddress,
          chain: routing.chain,
          userId: routing.userId,
        })

      case MessageType.SWAP:
        return await swapExecutor.execute({
          userMessage: routing.userMessage,
          walletAddress: routing.walletAddress,
          chain: routing.chain,
          userId: routing.userId,
        })

      case MessageType.SIGNAL:
        return await signalExecutor.execute({
          userMessage: routing.userMessage,
          walletAddress: routing.walletAddress,
          chain: routing.chain,
          userId: routing.userId,
        })

      case MessageType.BALANCE:
        return {
          response: "I can help you check your balance. Which token would you like to check?",
          executorType: "balance",
        }

      default:
        return {
          response:
            "I'm not sure what you're asking. I can help you with wallet analysis, sending tokens, swapping, or getting trading signals.",
          executorType: "unknown",
        }
    }
  } catch (err) {
    logger.error({ error: err, messageType: routing.messageType }, "Routing to executor failed")
    throw err
  }
}
