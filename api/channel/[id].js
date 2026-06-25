import { getSql } from '../../lib/db/client.js'
import { jsonResponse, errorResponse } from '../../lib/api-utils.js'
import {
  getChannels,
  getChannelVideos,
  getVideos,
  parseCount,
  formatStat,
} from '../../lib/youtube/client.js'

function calcEngagement(avgViews, subscribers) {
  if (!subscribers || subscribers === 0 || !avgViews) return null
  return ((avgViews / subscribers) * 100).toFixed(2)
}

async function fetchChannelDetail(channelId) {
  const [channelsRes, videosSearchRes] = await Promise.all([
    getChannels([channelId]),
    getChannelVideos(channelId, 10),
  ])

  const ch = channelsRes.items?.[0]
  if (!ch) throw new Error('Channel not found')

  const stats = ch.statistics || {}
  const snippet = ch.snippet || {}
  const branding = ch.brandingSettings?.channel || {}

  const videoIds = (videosSearchRes.items || [])
    .map((v) => v.id?.videoId)
    .filter(Boolean)

  let avgViews = null
  let avgLikes = null
  let engagementRate = null

  if (videoIds.length > 0) {
    const videosRes = await getVideos(videoIds)
    const views = (videosRes.items || []).map((v) => parseCount(v.statistics?.viewCount) || 0)
    const likes = (videosRes.items || []).map((v) => parseCount(v.statistics?.likeCount) || 0)
    if (views.length) {
      avgViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length)
    }
    if (likes.length) {
      avgLikes = Math.round(likes.reduce((a, b) => a + b, 0) / likes.length)
    }
    const subs = parseCount(stats.subscriberCount)
    engagementRate = calcEngagement(avgViews, subs)
  }

  const tags = (branding.keywords || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)

  return {
    channelId: ch.id,
    title: snippet.title || '',
    description: snippet.description || '',
    thumbnailUrl:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '',
    country: snippet.country || '-',
    defaultLanguage: snippet.defaultLanguage || '-',
    publishedAt: snippet.publishedAt || null,
    subscriberCount: formatStat(stats.subscriberCount),
    viewCount: formatStat(stats.viewCount),
    videoCount: formatStat(stats.videoCount),
    avgViews: avgViews ?? '-',
    avgLikes: avgLikes ?? '-',
    engagementRate: engagementRate ? `${engagementRate}%` : '-',
    tags,
    youtubeUrl: `https://www.youtube.com/channel/${ch.id}`,
    recentVideos: (videosSearchRes.items || []).map((v) => ({
      id: v.id?.videoId,
      title: v.snippet?.title,
      thumbnail: v.snippet?.thumbnails?.medium?.url,
      publishedAt: v.snippet?.publishedAt,
    })),
  }
}

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
