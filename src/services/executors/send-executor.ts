import crypto from "crypto"
import { query } from "../../config/database"
import { logger } from "../../config/logger"
import { generateResponse } from "../../ai/response-generator"
import * as blockchainService from "../blockchain-service"
import type { Chain, MessageType } from "../../types"

interface ExecuteSendInput {
  userMessage: string
  walletAddress: string
  chain: Chain
  userId: string
}

interface SendExecutorResult {
  response: string
  executorType: string
  actions?: any[]
}

// Parse send instruction from message
function parseSendInstruction(message: string): { recipient?: string; amount?: number; token?: string } {
  const parts = message.split(" ")
  return {
    amount: undefined, // Would be parsed from message
    recipient: undefined, // Would be parsed from message
    token: undefined, // Would be parsed from message
  }
}

export async function execute(input: ExecuteSendInput): Promise<SendExecutorResult> {
  try {
    logger.info(`Send executor processing: ${input.userMessage}`)

    const instruction = parseSendInstruction(input.userMessage)

    // Safety checks
    if (!instruction.recipient || !instruction.amount) {
      return {
        response: "I need more details. Please specify: recipient address, amount, and token to send.",
        executorType: "send",
      }
    }

    // Simulate transaction
    const simulation = await blockchainService.simulateTransaction({
      from: input.walletAddress,
      to: instruction.recipient,
      amount: instruction.amount,
      token: instruction.token,
      chain: input.chain,
    })

    // Generate response with confirmation request
    const aiResponse = await generateResponse({
      messageType: "send" as MessageType,
      userMessage: input.userMessage,
      context: [],
      walletAddress: input.walletAddress,
      chain: input.chain,
    })

    // Create pending transaction record
    const transactionId = crypto.randomUUID()
    await query(
      `INSERT INTO transactions (id, user_id, from_address, to_address, type, status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [transactionId, input.userId, input.walletAddress, instruction.recipient, "send", "pending", simulation],
    )

    return {
      response: aiResponse.response,
      executorType: "send",
      actions: [
        {
          type: "transaction_simulation",
          data: simulation,
          requiresConfirmation: true,
          transactionId,
        },
      ],
    }
  } catch (err) {
    logger.error({ error: err }, "Send executor failed")
    throw err
  }
}
