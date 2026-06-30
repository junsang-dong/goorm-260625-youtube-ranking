import { getSql } from '../../lib/db/client.js'
import { jsonResponse, errorResponse } from '../../lib/api-utils.js'
import { fetchChannelDetail } from '../../lib/youtube/channelDetail.js'

export const config = { runtime: 'edge' }

async function cacheChannel(sql, detail) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const subs = detail.subscriberCount === '-' ? null : Number(detail.subscriberCount)
  const views = detail.viewCount === '-' ? null : Number(detail.viewCount)
  const videos = detail.videoCount === '-' ? null : Number(detail.videoCount)

  await sql`
    INSERT INTO channels (
      channel_id, title, thumbnail_url, description, tags,
      subscriber_count, view_count, video_count, cached_at, expires_at
    ) VALUES (
      ${detail.channelId}, ${detail.title}, ${detail.thumbnailUrl},
      ${detail.description}, ${detail.tags}, ${subs}, ${views}, ${videos},
      NOW(), ${expiresAt}
    )
    ON CONFLICT (channel_id) DO UPDATE SET
      title = EXCLUDED.title,
      thumbnail_url = EXCLUDED.thumbnail_url,
      description = EXCLUDED.description,
      tags = EXCLUDED.tags,
      subscriber_count = EXCLUDED.subscriber_count,
      view_count = EXCLUDED.view_count,
      video_count = EXCLUDED.video_count,
      cached_at = NOW(),
      expires_at = EXCLUDED.expires_at
  `
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const channelId = segments[segments.length - 1]
    if (!channelId || channelId === 'channel') {
      return errorResponse('Channel ID required', 400)
    }

    const detail = await fetchChannelDetail(channelId)

    try {
      const sql = getSql()
      await cacheChannel(sql, detail)
    } catch (dbErr) {
      console.warn('Channel cache write failed:', dbErr)
    }

    return jsonResponse(detail)
  } catch (err) {
    console.error('Channel detail error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
