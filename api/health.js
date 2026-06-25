import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'

export default async function handler() {
  try {
    const sql = getSql()
    await sql`SELECT 1`
    return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Health check error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Unhealthy', 503)
  }
}
