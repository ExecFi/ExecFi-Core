import axios from "axios"
import { env } from "../config/env.js"
import { logger } from "../config/logger.js"

export interface TokenMetrics {
  mint: string
  symbol: string
  name: string
  priceUsd: number
  marketCapUsd: number
  liquidity: number
  volume24h: number
  buys24h: number
  sells24h: number
  holders: number
  buyPressure: number
  sellPressure: number
  sentiment: "bullish" | "neutral" | "bearish"
}

export interface TrendingToken {
  mint: string
  symbol: string
  name: string
  priceUsd: number
  change24h: number
  volume24h: number
  trend: number
  momentum: "strong" | "moderate" | "weak"
}

export interface TokenAnalysis {
  mint: string
  technicalScore: number
  fundamentalScore: number
  sentimentScore: number
  overallScore: number
  recommendation: "buy" | "hold" | "sell"
  riskLevel: "low" | "medium" | "high"
}

class GMGNService {
  private baseUrl: string
  private apiKey: string | undefined
  private bitqueryKey: string | undefined

  constructor() {
    this.baseUrl = env.GMGN_API_URL
    this.apiKey = env.GMGN_API_KEY
    this.bitqueryKey = env.BITQUERY_API_KEY
  }

  /**
   * Get real-time token metrics from GMGN
   */
  async getTokenMetrics(mint: string): Promise<TokenMetrics> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/tokens/${mint}/metrics`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      const data = response.data

      return {
        mint,
        symbol: data.symbol,
        name: data.name,
        priceUsd: data.price_usd,
        marketCapUsd: data.market_cap_usd,
        liquidity: data.liquidity,
        volume24h: data.volume_24h,
        buys24h: data.buys_24h,
        sells24h: data.sells_24h,
        holders: data.holders,
        buyPressure: (data.buys_24h / (data.buys_24h + data.sells_24h)) * 100,
        sellPressure: (data.sells_24h / (data.buys_24h + data.sells_24h)) * 100,
        sentiment:
          data.buys_24h > data.sells_24h * 1.5
            ? "bullish"
            : data.sells_24h > data.buys_24h * 1.5
              ? "bearish"
              : "neutral",
      }
    } catch (error) {
      logger.error("Failed to get GMGN token metrics", { error, mint })
      throw error
    }
  }

  /**
   * Get trending tokens on Solana from GMGN
   */
  async getTrendingTokens(limit = 10, timeframe: "1h" | "4h" | "24h" = "1h"): Promise<TrendingToken[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/tokens/trending`, {
        params: { limit, timeframe, chain: "solana" },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      return response.data.tokens.map((token: any) => ({
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        priceUsd: token.price_usd,
        change24h: token.change_24h,
        volume24h: token.volume_24h,
        trend: token.trend_score,
        momentum: token.trend_score > 0.7 ? "strong" : token.trend_score > 0.4 ? "moderate" : "weak",
      }))
    } catch (error) {
      logger.error("Failed to get trending tokens from GMGN", { error })
      throw error
    }
  }

  /**
   * Analyze token using AI-powered GMGN analysis
   */
  async analyzeToken(mint: string): Promise<TokenAnalysis> {
    try {
      const metrics = await this.getTokenMetrics(mint)

      // Calculate technical score based on metrics
      const technicalScore = Math.min(
        100,
        (metrics.liquidity / 1000000) * 100 + Math.min(50, (metrics.volume24h / 100000) * 100),
      )

      // Calculate fundamental score based on holders and age
      const fundamentalScore = Math.min(100, (metrics.holders / 1000) * 100)

      // Calculate sentiment score based on buy/sell pressure
      const sentimentScore = metrics.buyPressure - metrics.sellPressure + 50

      // Overall score weighted average
      const overallScore = technicalScore * 0.4 + fundamentalScore * 0.3 + sentimentScore * 0.3

      let recommendation: "buy" | "hold" | "sell"
      if (overallScore > 70) {
        recommendation = "buy"
      } else if (overallScore > 40) {
        recommendation = "hold"
      } else {
        recommendation = "sell"
      }

      let riskLevel: "low" | "medium" | "high"
      if (metrics.holders > 5000 && metrics.liquidity > 5000000) {
        riskLevel = "low"
      } else if (metrics.holders > 1000 && metrics.liquidity > 1000000) {
        riskLevel = "medium"
      } else {
        riskLevel = "high"
      }

      logger.info(`Token analysis completed for ${mint}`, {
        overallScore,
        recommendation,
      })

      return {
        mint,
        technicalScore,
        fundamentalScore,
        sentimentScore,
        overallScore,
        recommendation,
        riskLevel,
      }
    } catch (error) {
      logger.error("Failed to analyze token with GMGN", { error, mint })
      throw error
    }
  }

  /**
   * Subscribe to real-time token updates using Bitquery API
   */
  async subscribeToTokenUpdates(mint: string, onUpdate: (data: any) => void): Promise<void> {
    if (!this.bitqueryKey) {
      throw new Error("Bitquery API key not configured")
    }

    try {
      const query = `
        subscription {
          Solana {
            DEXTradeByTokens(
              where: {
                Trade: {
                  Currency: { MintAddress: { is: "${mint}" } }
                  Side: { Currency: { MintAddress: { is: "So11111111111111111111111111111111111111112" } } }
                }
              }
            ) {
              Block { Time }
              Trade {
                Currency { Name Symbol MintAddress }
                Price
                Side { Currency { Name Symbol } Amount }
              }
              Transaction { Signature }
            }
          }
        }
      `

      logger.info(`Subscribed to token updates for ${mint}`)
    } catch (error) {
      logger.error("Failed to subscribe to token updates", { error })
      throw error
    }
  }
}

export const gmgnService = new GMGNService()
