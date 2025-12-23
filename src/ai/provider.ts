import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { xai } from "@ai-sdk/xai"
import { env } from "../config/env"
import { logger } from "../config/logger"

type AIProvider = typeof openai | typeof google | typeof anthropic | typeof xai

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
    case "claude":
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not set")
      }
      logger.info("Using Claude (Anthropic) as AI provider")
      return anthropic
    case "grok":
      if (!env.XAI_API_KEY) {
        throw new Error("XAI_API_KEY is not set")
      }
      logger.info("Using Grok (xAI) as AI provider")
      return xai
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
    case "claude":
      return "claude-3-5-sonnet-20241022"
    case "grok":
      return "grok-2"
    default:
      return "gpt-4-turbo"
  }
}
