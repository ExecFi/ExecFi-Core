import { gmgnService } from "../gmgn-service.js"
import { logger } from "../../config/logger.js"
import { db } from "../../config/database.js"

export interface GMGNAnalysisParams {
  mint: string
  userAddress: string
  includeMetrics?: boolean
  analyzeTechnical?: boolean
}

/**
 * Execute GMGN token analysis via AI command
 */
export async function executeGMGNAnalysis(
  params: GMGNAnalysisParams,
  userId: string,
): Promise<{
  analysis: any
  metrics?: any
  recommendation: string
  riskScore: number
}> {
  try {
    logger.info("Executing GMGN analysis", { userId, mint: params.mint })

    // Get token analysis
    const analysis = await gmgnService.analyzeToken(params.mint)

    let metrics = null
    if (params.includeMetrics) {
      metrics = await gmgnService.getTokenMetrics(params.mint)
    }

    // Store analysis for reference
    await db.query(
      `INSERT INTO signals (user_id, token_mint, signal_type, confidence, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, token_mint) DO UPDATE SET data = $5`,
      [userId, params.mint, "gmgn_analysis", analysis.overallScore, JSON.stringify(analysis)],
    )

    const riskScore = analysis.riskLevel === "low" ? 20 : analysis.riskLevel === "medium" ? 50 : 80

    return {
      analysis,
      metrics,
      recommendation: analysis.recommendation,
      riskScore,
    }
  } catch (error) {
    logger.error("GMGN analysis execution failed", { error })
    throw error
  }
}

/**
 * Get trending tokens from GMGN
 */
export async function getTrendingTokensGMGN(
  userId: string,
  timeframe: "1h" | "4h" | "24h" = "1h",
): Promise<{
  trending: any[]
  updatedAt: number
}> {
  try {
    logger.info("Fetching trending tokens from GMGN", { userId })

    const trending = await gmgnService.getTrendingTokens(10, timeframe)

    return {
      trending,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error("Failed to get trending tokens", { error })
    throw error
  }
}
