import express, { type Router } from "express"
import { authMiddleware } from "../middlewares/auth.js"
import { executeGMGNAnalysis, getTrendingTokensGMGN } from "../services/executors/gmgn-analysis-executor.js"
import { logger } from "../config/logger.js"

const router: Router = express.Router()

/**
 * POST /api/gmgn/analyze
 * Analyze a token using GMGN AI
 */
router.post("/analyze", authMiddleware, async (req, res) => {
  try {
    const { mint, includeMetrics } = req.body

    if (!mint) {
      return res.status(400).json({ error: "Token mint address required" })
    }

    const result = await executeGMGNAnalysis(
      {
        mint,
        userAddress: req.user!.wallets[0]?.address,
        includeMetrics: includeMetrics || true,
      },
      req.user!.id,
    )

    res.json(result)
  } catch (error) {
    logger.error("GMGN analysis endpoint error", { error })
    res.status(500).json({ error: "Failed to analyze token" })
  }
})

/**
 * GET /api/gmgn/trending
 * Get trending tokens from GMGN
 */
router.get("/trending", authMiddleware, async (req, res) => {
  try {
    const timeframe = (req.query.timeframe as "1h" | "4h" | "24h") || "1h"

    const result = await getTrendingTokensGMGN(req.user!.id, timeframe)

    res.json(result)
  } catch (error) {
    logger.error("Get trending tokens endpoint error", { error })
    res.status(500).json({ error: "Failed to fetch trending tokens" })
  }
})

export default router
