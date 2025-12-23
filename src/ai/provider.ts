import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { env } from "../config/env"
import { logger } from "../config/logger"

type AIProvider = typeof openai | typeof google

export function getAIProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "openai":
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set")
      }
      logger.info("Using OpenAI as AI provider")
      return openai
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set")
      }
      logger.info("Using Gemini as AI provider")
      return google
    default:
      throw new Error(`Unknown AI provider: ${env.AI_PROVIDER}`)
  }
}

export function getModelName(): string {
  switch (env.AI_PROVIDER) {
    case "openai":
      return "gpt-4-turbo"
    case "gemini":
      return "gemini-1.5-pro"
    default:
      return "gpt-4-turbo"
  }
}
