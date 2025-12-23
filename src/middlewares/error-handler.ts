import type { Request, Response, NextFunction } from "express"
import { ZodError } from "zod"
import { logger } from "../config/logger"

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function errorHandler(err: Error | ZodError | AppError, req: Request, res: Response, next: NextFunction): void {
  logger.error({ error: err, path: req.path }, "Error handler caught")

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.flatten(),
    })
    return
  }

  res.status(500).json({
    error: "Internal server error",
  })
}
