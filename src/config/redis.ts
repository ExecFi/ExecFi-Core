import Redis from "ioredis"
import { env } from "./env"
import { logger } from "./logger"

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  reconnectOnError: (err) => {
    const targetError = "READONLY"
    if (err.message.includes(targetError)) {
      return true
    }
    return false
  },
})

redis.on("error", (err) => {
  logger.error("Redis error:", err)
})

redis.on("connect", () => {
  logger.info("Redis connected")
})

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key)
  return value ? JSON.parse(value) : null
}

export async function cacheSet<T>(key: string, value: T, ttl = 3600): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value))
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}
