import pg from "pg"
import { env } from "./env"
import { logger } from "./logger"

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", err)
  process.exit(-1)
})

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug({ query: text, duration, rows: result.rowCount }, "Query executed")
    return result.rows
  } catch (err) {
    logger.error({ query: text, error: err }, "Query failed")
    throw err
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}
