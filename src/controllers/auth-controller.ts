import type { Request, Response } from "express"
import { z } from "zod"
import * as authService from "../services/auth-service"
import { AppError } from "../middlewares/error-handler"
import { logger } from "../config/logger"
import type { AuthRequest } from "../middlewares/auth"
import { WalletAddressSchema, ChainSchema } from "../types"

const GenerateNonceSchema = z.object({
  walletAddress: WalletAddressSchema,
  chain: ChainSchema,
})

const VerifySignatureSchema = z.object({
  walletAddress: WalletAddressSchema,
  chain: ChainSchema,
  signature: z.string().min(10),
  message: z.string().min(1),
})

const AddWalletSchema = z.object({
  walletAddress: WalletAddressSchema,
  chain: ChainSchema,
})

export async function generateNonce(req: Request, res: Response): Promise<void> {
  try {
    const body = GenerateNonceSchema.parse(req.body)
    const result = await authService.generateNonce(body.walletAddress, body.chain)

    res.json({
      nonce: result.nonce,
      expiresAt: result.expiresAt,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Invalid request body", "VALIDATION_ERROR")
    }
    throw err
  }
}

export async function verifySignature(req: Request, res: Response): Promise<void> {
  try {
    const body = VerifySignatureSchema.parse(req.body)
    const { userId, walletId } = await authService.verifySignature(body)
    const { token, expiresAt } = await authService.generateToken(userId, body.walletAddress, body.chain, walletId)

    logger.info(`User ${userId} authenticated from ${body.walletAddress}`)

    res.json({
      token,
      expiresAt,
      user: {
        id: userId,
        walletAddress: body.walletAddress,
        chain: body.chain,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Invalid request body", "VALIDATION_ERROR")
    }
    throw new AppError(401, "Signature verification failed", "AUTH_FAILED")
  }
}

export async function addWallet(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const body = AddWalletSchema.parse(req.body)
    const result = await authService.addWalletToUser(req.user.userId, body.walletAddress, body.chain)

    await authService.auditLog(
      "WALLET_ADDED",
      "wallet",
      result.walletId,
      req.user.userId,
      result.walletId,
      { walletAddress: body.walletAddress, chain: body.chain },
      req.ip,
      req.headers["user-agent"],
    )

    res.json({
      walletId: result.walletId,
      message: "Wallet added successfully",
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Invalid request body", "VALIDATION_ERROR")
    }
    throw err
  }
}

export async function getUserWallets(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED")
    }

    const wallets = await authService.getUserWallets(req.user.userId)
    res.json({ wallets })
  } catch (err) {
    throw err
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      await authService.logoutSession(token)
    }

    res.json({ message: "Logged out successfully" })
  } catch (err) {
    throw err
  }
}
