import crypto from "crypto"
import { query } from "../../config/database"
import { logger } from "../../config/logger"
import { generateResponse } from "../../ai/response-generator"
import * as blockchainService from "../blockchain-service"
import type { Chain, MessageType } from "../../types"

interface ExecuteSwapInput {
  userMessage: string
  walletAddress: string
  chain: Chain
  userId: string
}

interface SwapExecutorResult {
  response: string
  executorType: string
  actions?: any[]
}

// Parse swap instruction from message
function parseSwapInstruction(message: string): { inputToken?: string; outputToken?: string; amount?: number } {
  return {
    inputToken: undefined,
    outputToken: undefined,
    amount: undefined,
  }
}

export async function execute(input: ExecuteSwapInput): Promise<SwapExecutorResult> {
  try {
    logger.info(`Swap executor processing: ${input.userMessage}`)

    const instruction = parseSwapInstruction(input.userMessage)

    // Validate swap instruction
    if (!instruction.inputToken || !instruction.outputToken || !instruction.amount) {
      return {
        response:
          "I need swap details. Please specify: input token, output token, and amount (e.g., 'Swap 1 SOL for USDC').",
        executorType: "swap",
      }
    }

    // Get best route
    const route = await blockchainService.getSwapRoute({
      inputToken: instruction.inputToken,
      outputToken: instruction.outputToken,
      amount: instruction.amount,
      chain: input.chain,
    })

    // Simulate swap
    const simulation = await blockchainService.simulateSwap({
      route,
      walletAddress: input.walletAddress,
      chain: input.chain,
    })

    // Generate response
    const aiResponse = await generateResponse({
      messageType: "swap" as MessageType,
      userMessage: input.userMessage,
      context: [],
      walletAddress: input.walletAddress,
      chain: input.chain,
    })

    // Create pending swap record
    const swapId = crypto.randomUUID()
    await query(
      `INSERT INTO swaps (id, user_id, input_token_address, output_token_address, input_amount, type, status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        swapId,
        input.userId,
        instruction.inputToken,
        instruction.outputToken,
        instruction.amount,
        "swap",
        "pending",
        route,
      ],
    )

    return {
      response: aiResponse.response,
      executorType: "swap",
      actions: [
        {
          type: "swap_quote",
          data: simulation,
          requiresConfirmation: true,
          swapId,
        },
      ],
    }
  } catch (err) {
    logger.error({ error: err }, "Swap executor failed")
    throw err
  }
}
