import crypto from "crypto"
import { query } from "../../config/database"
import { logger } from "../../config/logger"
import { generateResponse } from "../../ai/response-generator"
import * as blockchainService from "../blockchain-service"
import { SignalType, RiskLevel } from "../../types"
import type { Chain, MessageType } from "../../types"

interface ExecuteSignalInput {
  userMessage: string
  walletAddress: string
  chain: Chain
  userId: string
}

interface SignalExecutorResult {
  response: string
  executorType: string
  actions?: any[]
}

export async function execute(input: ExecuteSignalInput): Promise<SignalExecutorResult> {
  try {
    logger.info(`Signal executor processing: ${input.userMessage}`)

    // Generate AI response with market analysis
    const aiResponse = await generateResponse({
      messageType: "signal" as MessageType,
      userMessage: input.userMessage,
      context: [],
      walletAddress: input.walletAddress,
      chain: input.chain,
    })

    // Fetch on-chain data and generate signals
    const signals = await generateTradingSignals(input.userMessage, input.chain, input.userId)

    return {
      response: aiResponse.response,
      executorType: "signal",
      actions: signals,
    }
  } catch (err) {
    logger.error({ error: err }, "Signal executor failed")
    throw err
  }
}

async function generateTradingSignals(
  userMessage: string,
  chain: Chain,
  userId: string,
): Promise<{ type: string; data: any }[]> {
  try {
    // Extract token from message (simplified - would use AI in production)
    const tokenRegex = /([A-Za-z]+)/
    const match = userMessage.match(tokenRegex)
    const token = match ? match[1] : "SOL"

    // Fetch on-chain data
    const onChainData = await blockchainService.getTokenData(token, chain)

    // Calculate signal metrics
    const priceChange = onChainData.priceChange24h || 0
    const volumeRatio = (onChainData.volume24h || 0) / (onChainData.marketCap || 1)

    // Determine signal type
    let signalType = SignalType.HOLD
    if (priceChange > 5 && volumeRatio > 0.1) {
      signalType = SignalType.BUY
    } else if (priceChange < -5 && volumeRatio > 0.1) {
      signalType = SignalType.SELL
    }

    // Calculate confidence
    const confidence = Math.min(100, Math.abs(priceChange * 2) + volumeRatio * 20)

    // Store signal
    const signalId = crypto.randomUUID()
    await query(
      `INSERT INTO signals (id, user_id, token_address, token_symbol, chain, signal_type, confidence, risk_level, reasoning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        signalId,
        userId,
        onChainData.address,
        token,
        chain,
        signalType,
        Math.round(confidence),
        RiskLevel.MEDIUM,
        `Based on 24h price change: ${priceChange}%, Volume ratio: ${volumeRatio}`,
      ],
    )

    return [
      {
        type: "trading_signal",
        data: {
          token,
          signal: signalType,
          confidence: Math.round(confidence),
          riskLevel: RiskLevel.MEDIUM,
          metrics: onChainData,
        },
      },
    ]
  } catch (err) {
    logger.error({ error: err }, "Failed to generate trading signals")
    return []
  }
}
