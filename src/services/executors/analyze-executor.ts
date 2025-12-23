import { query } from "../../config/database"
import { logger } from "../../config/logger"
import * as blockchainService from "../blockchain-service"
import { generateResponse } from "../../ai/response-generator"
import type { Chain, MessageType } from "../../types"

interface ExecuteAnalysisInput {
  userMessage: string
  walletAddress: string
  chain: Chain
  userId: string
}

interface AnalysisExecutorResult {
  response: string
  executorType: string
  actions?: any[]
}

export async function execute(input: ExecuteAnalysisInput): Promise<AnalysisExecutorResult> {
  try {
    logger.info(`Analyze executor processing: ${input.userMessage}`)

    // Fetch wallet data from blockchain
    const walletData = await blockchainService.getWalletAnalysis(input.walletAddress, input.chain)

    // Generate AI response based on analysis
    const aiResponse = await generateResponse({
      messageType: "analysis" as MessageType,
      userMessage: input.userMessage,
      context: [],
      walletAddress: input.walletAddress,
      chain: input.chain,
    })

    // Log to database
    await query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [input.userId, "WALLET_ANALYZED", "wallet", input.walletAddress, JSON.stringify(walletData)],
    )

    return {
      response: aiResponse.response,
      executorType: "analyze",
      actions: [
        {
          type: "analysis",
          data: walletData,
        },
      ],
    }
  } catch (err) {
    logger.error({ error: err, walletAddress: input.walletAddress }, "Analysis executor failed")
    throw err
  }
}
