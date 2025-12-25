import { env } from "../config/env.js"
import { logger } from "../config/logger.js"
import fetch from "node-fetch"

export interface MarketData {
  id: string
  question: string
  outcomes: string[]
  prices: number[]
  volume24h: number
  liquidity: number
  createdAt: number
  endTime: number
  resolvedAt?: number
  resolvedValue?: number
}

export interface PredictionAnalysis {
  marketId: string
  question: string
  outcomes: string[]
  currentPrices: number[]
  aiPrediction: {
    favoredOutcome: string
    confidence: number // 0-100
    reasoning: string
    sentiment: "bullish" | "bearish" | "neutral"
  }
  riskAssessment: {
    liquidityRisk: number
    volatilityRisk: number
    resolutionRisk: number
    overallRisk: number
  }
  recommendedBet?: {
    outcome: string
    suggestedAmount: string
    expectedValue: number
  }
}

class PolymarketService {
  private apiUrl: string
  private apiKey: string

  constructor() {
    this.apiUrl = env.POLYMARKET_API_URL
    this.apiKey = env.POLYMARKET_API_KEY || ""
  }

  /**
   * Search for prediction markets
   */
  async searchMarkets(query: string, limit = 10): Promise<MarketData[]> {
    try {
      logger.info("Searching Polymarket markets", { query, limit })

      const response = await fetch(`${this.apiUrl}/markets?search=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to search markets: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      return this.formatMarkets(data.markets || [])
    } catch (error) {
      logger.error("Market search failed", { error, query })
      throw error
    }
  }

  /**
   * Get market details
   */
  async getMarket(marketId: string): Promise<MarketData> {
    try {
      logger.info("Fetching market details", { marketId })

      const response = await fetch(`${this.apiUrl}/markets/${marketId}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch market: ${response.statusText}`)
      }

      const market = (await response.json()) as any
      return this.formatMarket(market)
    } catch (error) {
      logger.error("Failed to fetch market", { error, marketId })
      throw error
    }
  }

  /**
   * Get trending prediction markets
   */
  async getTrendingMarkets(timeframe: "1h" | "24h" | "7d" = "24h", limit = 10): Promise<MarketData[]> {
    try {
      logger.info("Fetching trending markets", { timeframe, limit })

      const response = await fetch(`${this.apiUrl}/markets?orderBy=volume&timeframe=${timeframe}&limit=${limit}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch trending markets: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      return this.formatMarkets(data.markets || [])
    } catch (error) {
      logger.error("Failed to fetch trending markets", { error })
      throw error
    }
  }

  /**
   * Analyze market for AI prediction
   */
  async analyzeMarket(marketId: string): Promise<PredictionAnalysis> {
    try {
      logger.info("Analyzing market for prediction", { marketId })

      const market = await this.getMarket(marketId)

      // Calculate risk metrics
      const liquidityRisk = Math.max(0, 100 - Math.min(market.liquidity / 100000, 100))
      const volatilityRisk = this.calculateVolatilityRisk(market.prices)
      const daysUntilResolution = Math.ceil((market.endTime - Date.now() / 1000) / 86400)
      const resolutionRisk = Math.min(100, daysUntilResolution * 2)
      const overallRisk = (liquidityRisk + volatilityRisk + resolutionRisk) / 3

      // AI Prediction (simplified - in production use actual ML model)
      const aiPrediction = this.generateAIPrediction(market, volatilityRisk)

      // Recommend bet
      const recommendedBet = this.generateBetRecommendation(market, aiPrediction, overallRisk)

      return {
        marketId,
        question: market.question,
        outcomes: market.outcomes,
        currentPrices: market.prices,
        aiPrediction,
        riskAssessment: {
          liquidityRisk: Math.round(liquidityRisk),
          volatilityRisk: Math.round(volatilityRisk),
          resolutionRisk: Math.round(resolutionRisk),
          overallRisk: Math.round(overallRisk),
        },
        recommendedBet,
      }
    } catch (error) {
      logger.error("Market analysis failed", { error, marketId })
      throw error
    }
  }

  /**
   * Place prediction bet
   */
  async placeBet(
    marketId: string,
    outcome: number,
    amount: string,
    userAddress: string,
  ): Promise<{
    orderId: string
    marketId: string
    outcome: number
    amount: string
    estimatedPrice: number
  }> {
    try {
      logger.info("Placing prediction bet", { marketId, outcome, amount, userAddress })

      const response = await fetch(`${this.apiUrl}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          market_id: marketId,
          outcome,
          amount,
          maker: userAddress,
          side: "buy",
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to place bet: ${response.statusText}`)
      }

      const order = (await response.json()) as any
      return {
        orderId: order.id,
        marketId,
        outcome,
        amount,
        estimatedPrice: order.pricePerShare,
      }
    } catch (error) {
      logger.error("Failed to place bet", { error, marketId })
      throw error
    }
  }

  private calculateVolatilityRisk(prices: number[]): number {
    if (prices.length < 2) return 50

    const mean = prices.reduce((a, b) => a + b, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = (stdDev / mean) * 100

    return Math.min(100, coefficientOfVariation * 10)
  }

  private generateAIPrediction(market: MarketData, volatilityRisk: number): PredictionAnalysis["aiPrediction"] {
    // Simplified AI prediction logic
    const maxPriceIndex = market.prices.indexOf(Math.max(...market.prices))
    const favoredOutcome = market.outcomes[maxPriceIndex]
    const maxPrice = market.prices[maxPriceIndex]

    // Confidence based on price certainty
    const confidence = Math.round(maxPrice * 100)

    const sentiment = maxPrice > 0.6 ? "bullish" : maxPrice < 0.4 ? "bearish" : "neutral"

    return {
      favoredOutcome,
      confidence,
      reasoning: `Based on current market prices and trading volume, "${favoredOutcome}" appears to be the favored outcome with ${confidence}% confidence.`,
      sentiment,
    }
  }

  private generateBetRecommendation(
    market: MarketData,
    prediction: PredictionAnalysis["aiPrediction"],
    overallRisk: number,
  ): PredictionAnalysis["recommendedBet"] | undefined {
    if (prediction.confidence < 60) {
      return undefined // Only recommend if confidence is high enough
    }

    const baseAmount = overallRisk < 50 ? "100" : "50"
    const outcomeIndex = market.outcomes.indexOf(prediction.favoredOutcome)
    const outcomePrice = market.prices[outcomeIndex]

    return {
      outcome: prediction.favoredOutcome,
      suggestedAmount: baseAmount,
      expectedValue: Math.round((Number.parseFloat(baseAmount) * prediction.confidence) / 100),
    }
  }

  private formatMarket(market: any): MarketData {
    return {
      id: market.id,
      question: market.question,
      outcomes: market.outcomes || ["Yes", "No"],
      prices: market.prices || [0.5, 0.5],
      volume24h: market.volume24h || 0,
      liquidity: market.liquidity || 0,
      createdAt: market.createdAt || Date.now() / 1000,
      endTime: market.endTime || Date.now() / 1000 + 86400 * 30,
      resolvedAt: market.resolvedAt,
      resolvedValue: market.resolvedValue,
    }
  }

  private formatMarkets(markets: any[]): MarketData[] {
    return markets.map((m) => this.formatMarket(m))
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    return headers
  }
}

export const polymarketService = new PolymarketService()
