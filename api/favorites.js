import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'

export default async function handler(req) {
  try {
    const sql = getSql()

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) return errorResponse('sessionId required', 400)

      const rows = await sql`
        SELECT f.channel_id, f.added_at,
               c.title, c.thumbnail_url, c.subscriber_count, c.view_count
        FROM favorites f
        LEFT JOIN channels c ON c.channel_id = f.channel_id
        WHERE f.session_id = ${sessionId}
        ORDER BY f.added_at DESC
      `

      const favorites = rows.map((r) => ({
        channelId: r.channel_id,
        title: r.title || 'Unknown Channel',
        thumbnailUrl: r.thumbnail_url || '',
        subscriberCount: r.subscriber_count,
        viewCount: r.view_count,
        addedAt: r.added_at,
      }))

      return jsonResponse({ favorites })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { sessionId, channelId, action, title, thumbnailUrl } = body

      if (!sessionId || !channelId) {
        return errorResponse('sessionId and channelId required', 400)
      }

      if (action === 'remove') {
        await sql`
          DELETE FROM favorites
          WHERE session_id = ${sessionId} AND channel_id = ${channelId}
        `
        return jsonResponse({ success: true, action: 'removed' })
      }

      // Ensure minimal channel record exists for favorites display
      if (title) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await sql`
          INSERT INTO channels (channel_id, title, thumbnail_url, expires_at)
          VALUES (${channelId}, ${title}, ${thumbnailUrl || ''}, ${expiresAt})
          ON CONFLICT (channel_id) DO UPDATE SET
            title = COALESCE(EXCLUDED.title, channels.title),
            thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, channels.thumbnail_url)
        `
      }

      await sql`
        INSERT INTO favorites (session_id, channel_id)
        VALUES (${sessionId}, ${channelId})
        ON CONFLICT (session_id, channel_id) DO NOTHING
      `

      return jsonResponse({ success: true, action: 'added' })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('Favorites error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
