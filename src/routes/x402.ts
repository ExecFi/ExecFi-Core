import express, { type Router } from "express"
import { authMiddleware } from "../middlewares/auth.js"
import { executeX402Payment, verifyX402Payment } from "../services/executors/x402-executor.js"
import { logger } from "../config/logger.js"

const router: Router = express.Router()

/**
 * POST /api/x402/pay
 * Execute an X402 Solana payment
 */
router.post("/pay", authMiddleware, async (req, res) => {
  try {
    const { amount, recipientAddress, tokenMint, memo } = req.body

    if (!amount || !recipientAddress || !tokenMint) {
      return res.status(400).json({
        error: "Missing required fields: amount, recipientAddress, tokenMint",
      })
    }

    const senderAddress = req.user!.wallets[0]?.address

    const result = await executeX402Payment(
      {
        amount,
        recipientAddress,
        tokenMint,
        senderAddress,
        memo,
      },
      req.user!.id,
    )

    res.json(result)
  } catch (error) {
    logger.error("X402 payment endpoint error", { error })
    res.status(500).json({ error: "Failed to execute X402 payment" })
  }
})

/**
 * GET /api/x402/verify/:signature
 * Verify X402 payment status
 */
router.get("/verify/:signature", authMiddleware, async (req, res) => {
  try {
    const result = await verifyX402Payment(req.params.signature, req.user!.id)

    res.json(result)
  } catch (error) {
    logger.error("X402 verification endpoint error", { error })
    res.status(500).json({ error: "Failed to verify X402 payment" })
  }
})

export default router
