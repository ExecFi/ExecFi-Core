import { pool, query } from "../src/config/database"
import { logger } from "../src/config/logger"
import crypto from "crypto"

async function seed() {
  try {
    logger.info("Starting database seed...")

    // Create a test user
    const userId = crypto.randomUUID()
    await query(`INSERT INTO users (id, email, username, role) VALUES ($1, $2, $3, $4)`, [
      userId,
      "test@example.com",
      "testuser",
      "user",
    ])
    logger.info(`Created test user: ${userId}`)

    // Create test wallets
    const solanWalletId = crypto.randomUUID()
    await query(
      `INSERT INTO wallets (id, user_id, wallet_address, chain, is_primary, verified) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [solanWalletId, userId, "GKPLxmjVRfyvWFuiLEhjMpAxJ4F5L7h4X9eDJqU2Dwbb", "solana", true, true],
    )
    logger.info(`Created Solana wallet`)

    const ethWalletId = crypto.randomUUID()
    await query(
      `INSERT INTO wallets (id, user_id, wallet_address, chain, is_primary, verified) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ethWalletId, userId, "0x742d35Cc6634C0532925a3b844Bc59e4bC2eE36", "ethereum", false, true],
    )
    logger.info(`Created Ethereum wallet`)

    // Create a test conversation
    const conversationId = crypto.randomUUID()
    await query(`INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)`, [
      conversationId,
      userId,
      "Test Conversation",
    ])
    logger.info(`Created test conversation`)

    // Add some test messages
    const messageId1 = crypto.randomUUID()
    await query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content, type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId1, conversationId, userId, "user", "What is my SOL balance?", "balance"],
    )

    const messageId2 = crypto.randomUUID()
    await query(
      `INSERT INTO messages (id, conversation_id, user_id, role, content, type) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId2, conversationId, userId, "assistant", "Your SOL balance is 5.25 SOL", "analysis"],
    )
    logger.info(`Created test messages`)

    logger.info("Database seed completed successfully!")
  } catch (err) {
    logger.error({ error: err }, "Database seed failed")
    throw err
  } finally {
    await pool.end()
  }
}

seed()
