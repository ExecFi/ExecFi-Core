import express from "express"
import * as authController from "../controllers/auth-controller"
import { authMiddleware } from "../middlewares/auth"

const router = express.Router()

// Public routes
router.post("/nonce", async (req, res, next) => {
  try {
    await authController.generateNonce(req, res)
  } catch (err) {
    next(err)
  }
})

router.post("/verify", async (req, res, next) => {
  try {
    await authController.verifySignature(req, res)
  } catch (err) {
    next(err)
  }
})

// Protected routes
router.post("/wallet/add", authMiddleware, async (req, res, next) => {
  try {
    await authController.addWallet(req as any, res)
  } catch (err) {
    next(err)
  }
})

router.get("/wallets", authMiddleware, async (req, res, next) => {
  try {
    await authController.getUserWallets(req as any, res)
  } catch (err) {
    next(err)
  }
})

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    await authController.logout(req as any, res)
  } catch (err) {
    next(err)
  }
})

export default router
