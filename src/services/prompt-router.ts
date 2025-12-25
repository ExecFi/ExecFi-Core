import { MessageType, type Chain } from "../types"
import { logger } from "../config/logger"
import * as analyzeExecutor from "./executors/analyze-executor"
import * as sendExecutor from "./executors/send-executor"
import * as swapExecutor from "./executors/swap-executor"
import * as signalExecutor from "./executors/signal-executor"
import * as x402Executor from "./executors/x402-executor"
import * as gmgnExecutor from "./executors/gmgn-analysis-executor"
import * as polymarketExecutor from "./executors/polymarket-executor"

// Simple keyword-based classifier (in production, use AI for this)
export async function classifyMessage(message: string): Promise<MessageType> {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes("polymarket") ||
    lowerMessage.includes("prediction market") ||
    lowerMessage.includes("predict") ||
    lowerMessage.includes("bet on")
  ) {
    return MessageType.POLYMARKET_PREDICT
  }

  if (lowerMessage.includes("x402") || (lowerMessage.includes("pay") && lowerMessage.includes("solana"))) {
    return MessageType.X402_PAY
  }

  if (
    lowerMessage.includes("gmgn") ||
    lowerMessage.includes("trending tokens") ||
    (lowerMessage.includes("token analysis") && !lowerMessage.includes("send"))
  ) {
    return MessageType.GMGN_ANALYZE
  }

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
      case MessageType.POLYMARKET_PREDICT:
        return await polymarketExecutor.executePolymarketPrediction(
          {
            query: routing.userMessage,
            action: "predict",
            userAddress: routing.walletAddress,
          },
          routing.userId,
        )

      case MessageType.X402_PAY:
        return await x402Executor.executeX402Payment(
          {
            amount: 0,
            recipientAddress: "",
            tokenMint: "",
            senderAddress: routing.walletAddress,
          },
          routing.userId,
        )

      case MessageType.GMGN_ANALYZE:
        return await gmgnExecutor.getTrendingTokensGMGN(routing.userId)

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
            "I'm not sure what you're asking. I can help you with wallet analysis, sending tokens, swapping, X402 payments, GMGN token analysis, or getting trading signals.",
          executorType: "unknown",
        }
    }
  } catch (err) {
    logger.error({ error: err, messageType: routing.messageType }, "Routing to executor failed")
    throw err
  }
}
