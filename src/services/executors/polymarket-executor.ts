import { polymarketService } from "../polymarket-service.js"
import { logger } from "../../config/logger.js"
import { db } from "../../config/database.js"
import { generateText } from "ai"
import { getAIProvider } from "../../ai/provider.js"

export interface PolymarketPredictParams {
  query?: string
  marketId?: string
  action: "search" | "analyze" | "predict" | "bet"
  userAddress: string
  amount?: string
  outcomeIndex?: number
}

/**
 * Execute Polymarket prediction analysis via AI command
 */
export async function executePolymarketPrediction(
  params: PolymarketPredictParams,
  userId: string,
): Promise<{
  response: string
  executorType: string
  data?: any
  actions?: any[]
}> {
  try {
    logger.info("Executing Polymarket prediction", { userId, action: params.action })

    let result: any = {}

    switch (params.action) {
      case "search":
        if (!params.query) {
          return {
            response: "Please specify what prediction market you're looking for.",
            executorType: "polymarket",
          }
        }

        result = await polymarketService.searchMarkets(params.query, 5)
        return {
          response: `Found ${result.length} prediction markets. Here are the top results:`,
          executorType: "polymarket",
          data: result,
        }

      case "analyze":
        if (!params.marketId) {
          return {
            response: "Please specify a market ID to analyze.",
            executorType: "polymarket",
          }
        }

        result = await polymarketService.analyzeMarket(params.marketId)

        // Store analysis
        await db.query(
          `INSERT INTO signals (user_id, token_mint, signal_type, confidence, data)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, token_mint) DO UPDATE SET data = $5`,
          [userId, params.marketId, "polymarket_analysis", result.aiPrediction.confidence, JSON.stringify(result)],
        )

        const analysisPrompt = `Summarize this Polymarket analysis for a user:
Market: ${result.question}
Prediction: ${result.aiPrediction.favoredOutcome} with ${result.aiPrediction.confidence}% confidence
Risk Level: ${result.riskAssessment.overallRisk}%
Sentiment: ${result.aiPrediction.sentiment}

Provide a brief, actionable summary in 2-3 sentences.`

        const provider = getAIProvider()
        const { text: aiSummary } = await generateText({
          model: provider,
          prompt: analysisPrompt,
        })

        return {
          response: aiSummary,
          executorType: "polymarket",
          data: result,
        }

      case "predict":
        if (!params.query) {
          return {
            response: "Please ask about a specific prediction market.",
            executorType: "polymarket",
          }
        }

        const markets = await polymarketService.searchMarkets(params.query, 1)
        if (markets.length === 0) {
          return {
            response: "No prediction markets found for your query.",
            executorType: "polymarket",
          }
        }

        const market = markets[0]
        const analysis = await polymarketService.analyzeMarket(market.id)

        return {
          response: `Based on AI analysis: ${analysis.aiPrediction.reasoning} Risk Score: ${analysis.riskAssessment.overallRisk}/100`,
          executorType: "polymarket",
          data: analysis,
          actions: analysis.recommendedBet
            ? [
                {
                  type: "place_bet",
                  marketId: market.id,
                  outcome: market.outcomes.indexOf(analysis.recommendedBet.outcome),
                  amount: analysis.recommendedBet.suggestedAmount,
                },
              ]
            : [],
        }

      case "bet":
        if (!params.marketId || params.outcomeIndex === undefined || !params.amount) {
          return {
            response: "Please provide market ID, outcome, and amount to place a bet.",
            executorType: "polymarket",
          }
        }

        const betResult = await polymarketService.placeBet(
          params.marketId,
          params.outcomeIndex,
          params.amount,
          params.userAddress,
        )

        // Store transaction
        await db.query(
          `INSERT INTO transactions (user_id, wallet_address, chain, tx_hash, type, status, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            params.userAddress,
            "polygon",
            betResult.orderId,
            "polymarket_predict",
            "confirmed",
            JSON.stringify(betResult),
          ],
        )

        return {
          response: `Successfully placed bet on prediction market. Order ID: ${betResult.orderId}`,
          executorType: "polymarket",
          data: betResult,
        }

      default:
        return {
          response: "Invalid Polymarket action.",
          executorType: "polymarket",
        }
    }
  } catch (error) {
    logger.error("Polymarket prediction execution failed", { error })
    throw error
  }
}

/**
 * Get trending prediction markets
 */
export async function getTrendingPredictions(
  userId: string,
  timeframe: "1h" | "24h" | "7d" = "24h",
): Promise<{
  trending: any[]
  updatedAt: number
}> {
  try {
    logger.info("Fetching trending predictions", { userId, timeframe })

    const trending = await polymarketService.getTrendingMarkets(timeframe, 10)

    return {
      trending,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error("Failed to get trending predictions", { error })
    throw error
  }
}
