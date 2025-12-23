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
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),

  // Blockchain RPC URLs
  SOLANA_RPC_URL: z.string(),
  ETHEREUM_RPC_URL: z.string(),
  BASE_RPC_URL: z.string(),
  POLYGON_RPC_URL: z.string(),

  // Swap Providers
  JUPITER_API_URL: z.string().default("https://api.jup.ag"),
  UNISWAP_V3_PROVIDER_URL: z.string().optional(),

  // Security
  ALLOWED_CONTRACTS: z.string().default(""),
  BLOCKED_CONTRACTS: z.string().default(""),
  RATE_LIMIT_PER_HOUR: z.string().default("100"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
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
