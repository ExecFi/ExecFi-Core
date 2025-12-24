import { z } from "zod"

// Auth
export const WalletAddressSchema = z.string().regex(/^[a-zA-Z0-9]+$/, "Invalid wallet address")
export type WalletAddress = z.infer<typeof WalletAddressSchema>

export const ChainSchema = z.enum(["solana", "ethereum", "base", "polygon"])
export type Chain = z.infer<typeof ChainSchema>

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  AGENT = "agent",
}

export interface JWTPayload {
  userId: string
  walletAddress: WalletAddress
  chain: Chain
  role: UserRole
  iat: number
  exp: number
}

// Chat & Messages
export enum MessageType {
  ANALYSIS = "analysis",
  SEND = "send",
  SWAP = "swap",
  SIGNAL = "signal",
  BALANCE = "balance",
  X402_PAY = "x402_pay",
  GMGN_ANALYZE = "gmgn_analyze",
  UNKNOWN = "unknown",
}

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  type: z.nativeEnum(MessageType),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
})

export type Message = z.infer<typeof MessageSchema>

// Transactions
export const TransactionStatusSchema = z.enum(["pending", "confirmed", "failed", "cancelled"])
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>

export interface Transaction {
  id: string
  userId: string
  walletAddress: WalletAddress
  chain: Chain
  txHash: string
  type: "send" | "swap" | "analysis" | "x402_pay"
  status: TransactionStatus
  details: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Signals
export enum SignalType {
  BUY = "buy",
  SELL = "sell",
  HOLD = "hold",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export interface Signal {
  id: string
  userId: string
  tokenAddress: string
  chain: Chain
  type: SignalType
  confidence: number // 0-100
  riskLevel: RiskLevel
  reasoning: string
  createdAt: Date
}
