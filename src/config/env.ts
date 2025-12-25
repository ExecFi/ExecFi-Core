import { z } from "zod"

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  HOST: z.string().default("0.0.0.0"),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRY: z.string().default("7d"),

  // AI Providers
  AI_PROVIDER: z.enum(["openai", "gemini", "claude", "grok"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  GMGN_API_URL: z.string().default("https://api.gmgn.ai"),
  GMGN_API_KEY: z.string().optional(),
  BITQUERY_API_KEY: z.string().optional(),

  // Blockchain RPC URLs
  SOLANA_RPC_URL: z.string(),
  ETHEREUM_RPC_URL: z.string(),
  BASE_RPC_URL: z.string(),
  POLYGON_RPC_URL: z.string(),

  // Swap Providers
  JUPITER_API_URL: z.string().default("https://api.jup.ag"),
  UNISWAP_V3_PROVIDER_URL: z.string().optional(),
  X402_API_URL: z.string().default("https://api.x402.io"),
  X402_API_KEY: z.string().optional(),

  // Polymarket API configuration
  POLYMARKET_API_URL: z.string().default("https://clob.polymarket.com"),
  POLYMARKET_API_KEY: z.string().optional(),
})

export type Environment = z.infer<typeof envSchema>

export function loadEnv(): Environment {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten())
    process.exit(1)
  }

  return parsed.data
}

export const env = loadEnv()
