import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'
import { getCategoryById } from '../lib/constants/categories.js'
import { getRegionById } from '../lib/constants/regions.js'
import { getPopularVideos, getChannels, parseCount } from '../lib/youtube/client.js'
import { calcPopularityScore } from '../src/utils/popularityScore.js'
import { calcRankChange, buildYesterdayRankMap } from '../lib/ranking/diff.js'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayDate() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const RANKING_LIMIT = 15

async function fetchFromYouTube(categoryId, regionCode, limit) {
  const category = getCategoryById(categoryId)
  const region = getRegionById(regionCode)

  const popularRes = await getPopularVideos({
    categoryId: category.videoCategoryId,
    regionCode: region.regionCode,
    maxResults: 50,
  })

  const likesByChannel = new Map()
  const channelOrder = []

  for (const item of popularRes.items || []) {
    const chId = item.snippet?.channelId
    if (!chId) continue
    if (!likesByChannel.has(chId)) {
      likesByChannel.set(chId, [])
      channelOrder.push(chId)
    }
    const likes = parseCount(item.statistics?.likeCount) || 0
    likesByChannel.get(chId).push(likes)
  }

  const channelIds = channelOrder.slice(0, limit)
  const channelsRes = await getChannels(channelIds)

  const scored = (channelsRes.items || []).map((ch) => {
    const stats = ch.statistics || {}
    const viewCount = parseCount(stats.viewCount) || 0
    const channelLikes = likesByChannel.get(ch.id) || []
    const avgLikes = channelLikes.length
      ? Math.round(channelLikes.reduce((a, b) => a + b, 0) / channelLikes.length)
      : 0
    const popularityScore = calcPopularityScore(viewCount, avgLikes)
    return {
      channelId: ch.id,
      title: ch.snippet?.title || '',
      description: ch.snippet?.description || '',
      thumbnailUrl:
        ch.snippet?.thumbnails?.medium?.url ||
        ch.snippet?.thumbnails?.default?.url ||
        '',
      subscriberCount: parseCount(stats.subscriberCount),
      viewCount,
      videoCount: parseCount(stats.videoCount) || 0,
      tags: (ch.brandingSettings?.channel?.keywords || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5),
      avgLikes,
      popularityScore,
    }
  })

  scored.sort((a, b) => b.popularityScore - a.popularityScore)
  return scored.slice(0, limit)
}

async function getCachedRanking(sql, categoryId, regionId, today) {
  const region = getRegionById(regionId)
  const regionCode = region.regionCode

  if (regionCode === null) {
    return sql`
      SELECT r.rank, r.popularity_score, r.snapshot_date,
             c.channel_id, c.title, c.thumbnail_url, c.subscriber_count,
             c.view_count, c.video_count, c.cached_at, c.expires_at
      FROM rankings r
      JOIN channels c ON c.channel_id = r.channel_id
      WHERE r.category = ${categoryId}
        AND r.snapshot_date = ${today}
        AND r.region_code IS NULL
        AND c.expires_at > NOW()
      ORDER BY r.rank ASC
    `
  }

  return sql`
    SELECT r.rank, r.popularity_score, r.snapshot_date,
           c.channel_id, c.title, c.thumbnail_url, c.subscriber_count,
           c.view_count, c.video_count, c.cached_at, c.expires_at
    FROM rankings r
    JOIN channels c ON c.channel_id = r.channel_id
    WHERE r.category = ${categoryId}
      AND r.snapshot_date = ${today}
      AND r.region_code = ${regionCode}
      AND c.expires_at > NOW()
    ORDER BY r.rank ASC
  `
}

async function getYesterdayRanks(sql, categoryId, regionId) {
  const region = getRegionById(regionId)
  const regionCode = region.regionCode
  const yesterday = yesterdayDate()

  if (regionCode === null) {
    return sql`
      SELECT channel_id, rank
      FROM rankings
      WHERE category = ${categoryId}
        AND snapshot_date = ${yesterday}
        AND region_code IS NULL
    `
  }

  return sql`
    SELECT channel_id, rank
    FROM rankings
    WHERE category = ${categoryId}
      AND snapshot_date = ${yesterday}
      AND region_code = ${regionCode}
  `
}

async function saveRanking(sql, categoryId, regionId, channels) {
  const region = getRegionById(regionId)
  const regionCode = region.regionCode
  const category = getCategoryById(categoryId)
  const today = todayDate()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i]
    const rank = i + 1

    await sql`
      INSERT INTO channels (
        channel_id, title, category, region_code,
        subscriber_count, view_count, video_count,
        thumbnail_url, description, tags, cached_at, expires_at
      ) VALUES (
        ${ch.channelId}, ${ch.title}, ${category.label}, ${regionCode},
        ${ch.subscriberCount}, ${ch.viewCount}, ${ch.videoCount},
        ${ch.thumbnailUrl}, ${ch.description}, ${ch.tags}, NOW(), ${expiresAt}
      )
      ON CONFLICT (channel_id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        region_code = EXCLUDED.region_code,
        subscriber_count = EXCLUDED.subscriber_count,
        view_count = EXCLUDED.view_count,
        video_count = EXCLUDED.video_count,
        thumbnail_url = EXCLUDED.thumbnail_url,
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        cached_at = NOW(),
        expires_at = EXCLUDED.expires_at
    `

    await sql`
      INSERT INTO rankings (channel_id, category, region_code, rank, popularity_score, snapshot_date)
      VALUES (${ch.channelId}, ${categoryId}, ${regionCode}, ${rank}, ${ch.popularityScore}, ${today})
      ON CONFLICT (channel_id, category, region_code, snapshot_date) DO UPDATE SET
        rank = EXCLUDED.rank,
        popularity_score = EXCLUDED.popularity_score
    `
  }
}

function enrichWithRankChange(rows, yesterdayMap) {
  return rows.map((row) => {
    const rankChange = calcRankChange(row.rank, yesterdayMap.get(row.channel_id))
    return {
      rank: row.rank,
      channelId: row.channel_id,
      title: row.title,
      thumbnailUrl: row.thumbnail_url,
      subscriberCount: row.subscriber_count,
      viewCount: row.view_count,
      videoCount: row.video_count,
      popularityScore: row.popularity_score,
      rankChange,
      cachedAt: row.cached_at,
    }
  })
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(req.url)
    const categoryId = url.searchParams.get('category') || 'entertainment'
    const regionId = url.searchParams.get('region') || 'WW'
    const limit = Math.min(Number(url.searchParams.get('limit') || RANKING_LIMIT), RANKING_LIMIT)
    const today = todayDate()
    const sql = getSql()

    let fromCache = false
    let cachedAt = null
    let rows = await getCachedRanking(sql, categoryId, regionId, today)

    if (rows.length > 0) {
      fromCache = true
      cachedAt = rows[0].cached_at
    } else {
      const channels = await fetchFromYouTube(categoryId, regionId, limit)
      if (channels.length === 0) {
        return jsonResponse({ channels: [], fromCache: false, cachedAt: null })
      }
      await saveRanking(sql, categoryId, regionId, channels)
      rows = await getCachedRanking(sql, categoryId, regionId, today)
      cachedAt = new Date().toISOString()
    }

    const yesterdayRows = await getYesterdayRanks(sql, categoryId, regionId)
    const yesterdayMap = buildYesterdayRankMap(yesterdayRows)
    const channels = enrichWithRankChange(rows, yesterdayMap)
    const category = getCategoryById(categoryId)

    return jsonResponse({
      channels,
      category: category.label,
      region: getRegionById(regionId).label,
      fromCache,
      cachedAt,
    })
  } catch (err) {
    console.error('Ranking error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
