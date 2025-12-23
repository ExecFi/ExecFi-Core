import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import { logger } from "../config/logger"
import type { JWTPayload } from "../types"

export interface AuthRequest extends Request {
  user?: JWTPayload
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" })
      return
    }

    const token = authHeader.slice(7)
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload
    req.user = decoded
    next()
  } catch (err) {
    logger.error({ error: err }, "Auth middleware error")
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload
      req.user = decoded
    }
  } catch (err) {
    logger.debug({ error: err }, "Optional auth failed, continuing without user")
  }
  next()
}
