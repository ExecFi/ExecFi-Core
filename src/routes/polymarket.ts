import { Router } from "express"
import { auth } from "../middlewares/auth.js"
import { executePolymarketPrediction, getTrendingPredictions } from "../services/executors/polymarket-executor.js"
import { polymarketService } from "../services/polymarket-service.js"
import { logger } from "../config/logger.js"

const router = Router()

router.use(auth)

/**
 * Search prediction markets
 */
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query
    const query = (q as string) || ""

    const markets = await polymarketService.searchMarkets(query, Number.parseInt(limit as string))

    res.json({
      success: true,
      data: markets,
    })
  } catch (error) {
    logger.error("Search markets failed", { error })
    res.status(500).json({
      success: false,
      error: "Failed to search markets",
    })
  }
})

/**
 * Get market details and analysis
 */
router.get("/:marketId/analyze", async (req, res) => {
  try {
    const { marketId } = req.params
    const userId = req.userId || ""

    const analysis = await executePolymarketPrediction(
      {
        marketId,
        action: "analyze",
        userAddress: req.walletAddress || "",
      },
      userId,
    )

    res.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    logger.error("Market analysis failed", { error })
    res.status(500).json({
      success: false,
      error: "Failed to analyze market",
    })
  }
})

/**
 * Get trending prediction markets
 */
router.get("/trending", async (req, res) => {
  try {
    const { timeframe = "24h" } = req.query
    const userId = req.userId || ""

    const result = await getTrendingPredictions(userId, (timeframe as "1h" | "24h" | "7d") || "24h")

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error("Get trending failed", { error })
    res.status(500).json({
      success: false,
      error: "Failed to get trending predictions",
    })
  }
})

/**
 * Place prediction bet
 */
router.post("/:marketId/bet", async (req, res) => {
  try {
    const { marketId } = req.params
    const { outcomeIndex, amount } = req.body
    const userId = req.userId || ""
    const userAddress = req.walletAddress || ""

    const result = await executePolymarketPrediction(
      {
        marketId,
        action: "bet",
        userAddress,
        outcomeIndex,
        amount,
      },
      userId,
    )

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error("Place bet failed", { error })
    res.status(500).json({
      success: false,
      error: "Failed to place bet",
    })
  }
})

export default router
