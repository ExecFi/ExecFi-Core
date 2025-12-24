import axios from "axios"
import { env } from "../config/env.js"
import { logger } from "../config/logger.js"

export interface X402PaymentRequest {
  amount: number
  recipientAddress: string
  tokenMint: string
  senderAddress: string
}

export interface X402Transaction {
  signature: string
  status: "pending" | "completed" | "failed"
  amount: number
  tokenMint: string
  timestamp: number
}

class X402Service {
  private baseUrl: string
  private apiKey: string | undefined

  constructor() {
    this.baseUrl = env.X402_API_URL
    this.apiKey = env.X402_API_KEY
  }

  /**
   * Create an X402 payment request for SPL token transactions
   */
  async createPaymentRequest(request: X402PaymentRequest): Promise<{ paymentUrl: string; expiresAt: number }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments`,
        {
          amount: request.amount,
          recipient: request.recipientAddress,
          token_mint: request.tokenMint,
          sender: request.senderAddress,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      logger.info(`X402 payment request created: ${response.data.payment_id}`)

      return {
        paymentUrl: response.data.payment_url,
        expiresAt: response.data.expires_at,
      }
    } catch (error) {
      logger.error("X402 payment request failed", { error })
      throw new Error(`X402 payment creation failed: ${error}`)
    }
  }

  /**
   * Retrieve transaction status from X402
   */
  async getTransactionStatus(signature: string): Promise<X402Transaction> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/transactions/${signature}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      return {
        signature: response.data.signature,
        status: response.data.status,
        amount: response.data.amount,
        tokenMint: response.data.token_mint,
        timestamp: response.data.timestamp,
      }
    } catch (error) {
      logger.error("Failed to get X402 transaction status", { error })
      throw error
    }
  }

  /**
   * Estimate gas fees for X402 transaction
   */
  async estimateFees(amount: number, tokenMint: string): Promise<{ lamportFee: number; tokenFee: number }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/estimate-fees`,
        { amount, token_mint: tokenMint },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      )

      return {
        lamportFee: response.data.lamport_fee,
        tokenFee: response.data.token_fee,
      }
    } catch (error) {
      logger.error("Failed to estimate X402 fees", { error })
      throw error
    }
  }
}

export const x402Service = new X402Service()
