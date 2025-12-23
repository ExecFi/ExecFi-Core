import type { Request, Response, NextFunction } from "express"
import { redis } from "../config/redis"
import { env } from "../config/env"
import { logger } from "../config/logger"

export interface RateLimitRequest extends Request {
  rateLimit?: { remaining: number }
}

export async function rateLimitMiddleware(req: RateLimitRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const identifier = (req.user as any)?.walletAddress || req.ip
    const key = `rate-limit:${identifier}`
    const limit = Number.parseInt(env.RATE_LIMIT_PER_HOUR)

    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, 3600)
    }

    const remaining = Math.max(0, limit - current)
    req.rateLimit = { remaining }

    res.setHeader("X-RateLimit-Limit", limit)
    res.setHeader("X-RateLimit-Remaining", remaining)
    res.setHeader("X-RateLimit-Reset", new Date(Date.now() + 3600000).toISOString())

    if (current > limit) {
      res.status(429).json({ error: "Rate limit exceeded" })
      return
    }

    next()
  } catch (err) {
    logger.error({ error: err }, "Rate limit middleware error")
    next()
  }
}
