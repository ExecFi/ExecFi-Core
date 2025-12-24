import { x402Service } from "../x402-service.js"
import { logger } from "../../config/logger.js"
import { db } from "../../config/database.js"

export interface X402ExecutionParams {
  amount: number
  recipientAddress: string
  tokenMint: string
  senderAddress: string
  memo?: string
}

/**
 * Execute X402 Solana payments via AI command
 */
export async function executeX402Payment(
  params: X402ExecutionParams,
  userId: string,
): Promise<{ signature: string; status: string; feesEstimated: any }> {
  try {
    logger.info("Executing X402 payment", { userId, tokenMint: params.tokenMint })

    // Get X402 fees
    const fees = await x402Service.estimateFees(params.amount, params.tokenMint)

    // Create payment request
    const paymentRequest = await x402Service.createPaymentRequest({
      amount: params.amount,
      recipientAddress: params.recipientAddress,
      tokenMint: params.tokenMint,
      senderAddress: params.senderAddress,
    })

    // Store transaction record
    await db.query(
      `INSERT INTO transactions (user_id, type, status, amount, token_mint, recipient_address, tx_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        "x402_payment",
        "pending",
        params.amount,
        params.tokenMint,
        params.recipientAddress,
        JSON.stringify({ paymentUrl: paymentRequest.paymentUrl }),
      ],
    )

    return {
      signature: "pending",
      status: "pending",
      feesEstimated: fees,
    }
  } catch (error) {
    logger.error("X402 payment execution failed", { error })
    throw error
  }
}

/**
 * Verify and confirm X402 payment status
 */
export async function verifyX402Payment(
  signature: string,
  userId: string,
): Promise<{
  confirmed: boolean
  status: string
  blockTime?: number
}> {
  try {
    const tx = await x402Service.getTransactionStatus(signature)

    if (tx.status === "completed") {
      await db.query(
        `UPDATE transactions SET status = $1, tx_hash = $2 WHERE user_id = $3 AND tx_data->>'signature' = $4`,
        ["completed", signature, userId, signature],
      )
    }

    return {
      confirmed: tx.status === "completed",
      status: tx.status,
      blockTime: tx.timestamp,
    }
  } catch (error) {
    logger.error("X402 payment verification failed", { error })
    throw error
  }
}
