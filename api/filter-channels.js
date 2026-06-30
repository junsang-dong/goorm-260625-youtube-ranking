import { jsonResponse, errorResponse } from '../lib/api-utils.js'
import { validateChannel } from '../lib/graph/nodes.js'

export const config = { runtime: 'edge' }

const SUPPORTED_LANGS = ['en', 'ko', 'ja', 'zh']
const CONCURRENCY = 4

function toNum(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalize(channel) {
  return {
    channelId: channel.id || channel.channelId,
    title: channel.title || '',
    description: channel.description || '',
    tags: Array.isArray(channel.tags) ? channel.tags : [],
    category: channel.category,
    subscriberCountNum: toNum(channel.subscriberCount ?? channel.subscriberCountNum),
    viewCountNum: toNum(channel.viewCount ?? channel.viewCountNum),
    videoCountNum: toNum(channel.videoCount ?? channel.videoCountNum),
    avgViewsNum: toNum(channel.avgViews ?? channel.avgViewsNum),
    engagementRateNum: toNum(channel.engagementRate ?? channel.engagementRateNum),
  }
}

/** Run an async mapper over items with a bounded concurrency. */
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      results[current] = await mapper(items[current], current)
    }
  })
  await Promise.all(workers)
  return results
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json()
    const channels = Array.isArray(body.channels) ? body.channels : []
    const threshold = typeof body.threshold === 'number' ? body.threshold : 0.6
    const lang = SUPPORTED_LANGS.includes(body.lang) ? body.lang : 'en'

    if (channels.length === 0) {
      return errorResponse('channels array required', 400)
    }

    const evaluated = await mapLimit(channels, CONCURRENCY, async (channel) => {
      const channelData = normalize(channel)
      try {
        const { filters } = await validateChannel({ channelData, lang })
        return {
          channelId: channelData.channelId,
          score: filters.score,
          trusted: filters.trusted,
          flags: filters.flags,
          reason: filters.reason,
        }
      } catch (err) {
        return {
          channelId: channelData.channelId,
          score: 0,
          trusted: false,
          flags: ['error'],
          reason: err instanceof Error ? err.message : 'evaluation failed',
        }
      }
    })

    const filtered = evaluated.filter((c) => c.score >= threshold)

    return jsonResponse({
      success: true,
      filtered,
      filtered_count: filtered.length,
      total_count: channels.length,
    })
  } catch (err) {
    console.error('Filter channels error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
