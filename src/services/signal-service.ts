import { query } from "../config/database"
import { logger } from "../config/logger"
import type { Chain, Signal, SignalType } from "../types"
import type { RiskLevel } from "../types"

interface CreateSignalInput {
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  chain: Chain
  type: SignalType
  confidence: number
  riskLevel: RiskLevel
  reasoning: string
  priceAtSignal?: number
  volume24h?: number
}

interface SignalAnalysisInput {
  tokenAddress: string
  chain: Chain
}

interface SignalMetrics {
  priceChange24h: number
  volumeChange24h: number
  liquidityScore: number
  communityScore: number
  holdersDistribution: number
  onChainActivity: number
}

export async function createSignal(input: CreateSignalInput): Promise<Signal> {
  try {
    const signalId = await query(
      `INSERT INTO signals (id, user_id, token_address, token_symbol, chain, signal_type, confidence, risk_level, reasoning, price_at_signal, volume_24h)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.userId,
        input.tokenAddress,
        input.tokenSymbol,
        input.chain,
        input.type,
        input.confidence,
        input.riskLevel,
        input.reasoning,
        input.priceAtSignal,
        input.volume24h,
      ],
    )

    logger.info(`Created signal for ${input.tokenSymbol} on ${input.chain}`)

    return {
      id: signalId as string,
      userId: input.userId,
      tokenAddress: input.tokenAddress,
      chain: input.chain,
      type: input.type,
      confidence: input.confidence,
      riskLevel: input.riskLevel,
      reasoning: input.reasoning,
      createdAt: new Date(),
    }
  } catch (err) {
    logger.error({ error: err }, "Failed to create signal")
    throw err
  }
}

export async function getUserSignals(userId: string, limit = 50): Promise<Signal[]> {
  try {
    const signals = await query(
      `SELECT id, user_id, token_address, token_symbol, chain, signal_type, confidence, risk_level, reasoning, price_at_signal, volume_24h, created_at
       FROM signals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    )

    return signals.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      tokenAddress: s.token_address,
      chain: s.chain,
      type: s.signal_type,
      confidence: s.confidence,
      riskLevel: s.risk_level,
      reasoning: s.reasoning,
      createdAt: s.created_at,
    }))
  } catch (err) {
    logger.error({ error: err, userId }, "Failed to fetch user signals")
    throw err
  }
}

export async function analyzeToken(input: SignalAnalysisInput): Promise<SignalMetrics> {
  try {
    // In production, integrate with:
    // - DEXScreener, CoinGecko, or similar for price/volume
    // - Blockchain RPC for on-chain metrics
    // - Social media APIs for sentiment
    // - Holders distribution from block explorers

    return {
      priceChange24h: 5.2,
      volumeChange24h: 12.5,
      liquidityScore: 78,
      communityScore: 65,
      holdersDistribution: 85,
      onChainActivity: 72,
    }
  } catch (err) {
    logger.error({ error: err }, "Token analysis failed")
    throw err
  }
}

export async function calculateSignalScore(metrics: SignalMetrics): Promise<{
  score: number
  signalType: SignalType
  confidence: number
  riskLevel: RiskLevel
}> {
  try {
    // Weighted scoring algorithm
    const weights = {
      priceChange: 0.25,
      volume: 0.2,
      liquidity: 0.2,
      community: 0.15,
      holders: 0.1,
      onChain: 0.1,
    }

    // Normalize metrics to 0-100
    const normalizedPrice = Math.max(0, Math.min(100, metrics.priceChange24h * 5 + 50))
    const normalizedVolume = Math.max(0, Math.min(100, metrics.volumeChange24h * 4 + 50))

    const compositeScore =
      normalizedPrice * weights.priceChange +
      normalizedVolume * weights.volume +
      metrics.liquidityScore * weights.liquidity +
      metrics.communityScore * weights.community +
      metrics.holdersDistribution * weights.holders +
      metrics.onChainActivity * weights.onChain

    // Determine signal type
    let signalType: SignalType = "hold"
    if (compositeScore > 65) {
      signalType = "buy"
    } else if (compositeScore < 35) {
      signalType = "sell"
    }

    // Determine confidence
    const confidence = (Math.abs(compositeScore - 50) / 50) * 100

    // Determine risk level based on volatility and metrics
    let riskLevel: RiskLevel = "medium"
    if (metrics.onChainActivity < 40 || metrics.holdersDistribution < 40) {
      riskLevel = "high"
    } else if (metrics.liquidityScore > 80 && metrics.onChainActivity > 70) {
      riskLevel = "low"
    }

    return {
      score: Math.round(compositeScore),
      signalType,
      confidence: Math.round(confidence),
      riskLevel,
    }
  } catch (err) {
    logger.error({ error: err }, "Signal scoring failed")
    throw err
  }
}

export async function getRecentSignals(chain: Chain, limit = 20): Promise<Signal[]> {
  try {
    const signals = await query(
      `SELECT id, user_id, token_address, token_symbol, chain, signal_type, confidence, risk_level, reasoning, created_at
       FROM signals
       WHERE chain = $1 AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT $2`,
      [chain, limit],
    )

    return signals.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      tokenAddress: s.token_address,
      chain: s.chain,
      type: s.signal_type,
      confidence: s.confidence,
      riskLevel: s.risk_level,
      reasoning: s.reasoning,
      createdAt: s.created_at,
    }))
  } catch (err) {
    logger.error({ error: err, chain }, "Failed to fetch recent signals")
    throw err
  }
}
