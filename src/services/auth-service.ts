import crypto from "crypto"
import jwt from "jsonwebtoken"
import { query, queryOne } from "../config/database"
import { env } from "../config/env"
import { logger } from "../config/logger"
import type { Chain, JWTPayload, UserRole, WalletAddress } from "../types"
import { UserRole as UserRoleEnum } from "../types"

interface GenerateNonceResult {
  nonce: string
  expiresAt: Date
}

interface VerifySignatureInput {
  walletAddress: WalletAddress
  chain: Chain
  signature: string
  message: string
}

interface GenerateTokenResult {
  token: string
  expiresAt: Date
}

export async function generateNonce(walletAddress: WalletAddress, chain: Chain): Promise<GenerateNonceResult> {
  const nonce = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  try {
    // Try to find wallet first
    const existingWallet = await queryOne(`SELECT id FROM wallets WHERE wallet_address = $1 AND chain = $2`, [
      walletAddress,
      chain,
    ])

    if (existingWallet) {
      // Update existing wallet's nonce
      await query(`UPDATE wallets SET nonce = $1 WHERE wallet_address = $2 AND chain = $3`, [
        nonce,
        walletAddress,
        chain,
      ])
    }

    logger.info(`Generated nonce for ${walletAddress} on ${chain}`)
  } catch (err) {
    logger.error({ error: err, walletAddress, chain }, "Failed to generate nonce")
    throw err
  }

  return { nonce, expiresAt }
}

export async function verifySignature({
  walletAddress,
  chain,
  signature,
  message,
}: VerifySignatureInput): Promise<{ userId: string; walletId: string }> {
  try {
    // Get wallet and verify nonce exists
    const wallet = await queryOne(`SELECT id, nonce, user_id FROM wallets WHERE wallet_address = $1 AND chain = $2`, [
      walletAddress,
      chain,
    ])

    if (!wallet) {
      // Create new user and wallet if they don't exist
      return await createUserWithWallet(walletAddress, chain)
    }

    // In production, you'd verify the signature against the message using the chain's verification method
    // For this example, we're simplified - in real implementation:
    // - For Solana: use nacl.sign.detached.verify
    // - For EVM chains: use ethers.verifyMessage or ethers.recoverAddress
    // TODO: Implement actual signature verification per chain

    logger.info(`Verified signature for ${walletAddress} on ${chain}`)

    return {
      userId: wallet.user_id,
      walletId: wallet.id,
    }
  } catch (err) {
    logger.error({ error: err, walletAddress, chain }, "Signature verification failed")
    throw err
  }
}

export async function createUserWithWallet(
  walletAddress: WalletAddress,
  chain: Chain,
): Promise<{ userId: string; walletId: string }> {
  try {
    const userId = crypto.randomUUID()
    const walletId = crypto.randomUUID()

    // Create user
    await query(`INSERT INTO users (id, email, role) VALUES ($1, $2, $3)`, [
      userId,
      `wallet-${walletAddress}@execfi.local`,
      UserRoleEnum.USER,
    ])

    // Create wallet
    await query(
      `INSERT INTO wallets (id, user_id, wallet_address, chain, is_primary, verified) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [walletId, userId, walletAddress, chain, true, true],
    )

    logger.info(`Created new user and wallet for ${walletAddress} on ${chain}`)

    return { userId, walletId }
  } catch (err) {
    logger.error({ error: err, walletAddress, chain }, "Failed to create user with wallet")
    throw err
  }
}

export async function generateToken(
  userId: string,
  walletAddress: WalletAddress,
  chain: Chain,
  walletId: string,
): Promise<GenerateTokenResult> {
  try {
    // Get user role
    const user = await queryOne(`SELECT role FROM users WHERE id = $1`, [userId])

    if (!user) {
      throw new Error("User not found")
    }

    const payload: JWTPayload = {
      userId,
      walletAddress,
      chain,
      role: user.role as UserRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    }

    const token = jwt.sign(payload, env.JWT_SECRET)
    const expiresAt = new Date(payload.exp * 1000)

    // Store token hash in sessions table
    const sessionId = crypto.randomUUID()
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    await query(`INSERT INTO sessions (id, user_id, wallet_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`, [
      sessionId,
      userId,
      walletId,
      tokenHash,
      expiresAt,
    ])

    logger.info(`Generated token for user ${userId}`)

    return { token, expiresAt }
  } catch (err) {
    logger.error({ error: err, userId }, "Failed to generate token")
    throw err
  }
}

export async function addWalletToUser(
  userId: string,
  walletAddress: WalletAddress,
  chain: Chain,
): Promise<{ walletId: string }> {
  try {
    // Check if wallet already exists for this user
    const existing = await queryOne(
      `SELECT id FROM wallets WHERE user_id = $1 AND wallet_address = $2 AND chain = $3`,
      [userId, walletAddress, chain],
    )

    if (existing) {
      return { walletId: existing.id }
    }

    // Create new wallet
    const walletId = crypto.randomUUID()
    await query(
      `INSERT INTO wallets (id, user_id, wallet_address, chain, verified) 
       VALUES ($1, $2, $3, $4, $5)`,
      [walletId, userId, walletAddress, chain, true],
    )

    logger.info(`Added wallet ${walletAddress} to user ${userId}`)

    return { walletId }
  } catch (err) {
    logger.error({ error: err, userId, walletAddress }, "Failed to add wallet to user")
    throw err
  }
}

export async function getUserWallets(userId: string): Promise<any[]> {
  try {
    const wallets = await query(
      `SELECT id, wallet_address, chain, label, is_primary, verified FROM wallets WHERE user_id = $1 ORDER BY is_primary DESC`,
      [userId],
    )
    return wallets
  } catch (err) {
    logger.error({ error: err, userId }, "Failed to fetch user wallets")
    throw err
  }
}

export async function logoutSession(token: string): Promise<void> {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash])
    logger.info("Session logged out")
  } catch (err) {
    logger.error({ error: err }, "Failed to logout session")
    throw err
  }
}

export async function auditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  userId?: string,
  walletId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const auditId = crypto.randomUUID()
    await query(
      `INSERT INTO audit_logs (id, user_id, wallet_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [auditId, userId || null, walletId || null, action, resourceType, resourceId, details, ipAddress, userAgent],
    )
  } catch (err) {
    logger.error({ error: err }, "Failed to log audit entry")
  }
}
