import { jsonResponse, errorResponse } from '../lib/api-utils.js'
import { searchChannels } from '../lib/youtube/client.js'

export default async function handler(req) {
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()
    const region = url.searchParams.get('region') || 'WW'

    if (!q) {
      return jsonResponse({ results: [] })
    }

    const regionCode = region === 'WW' ? null : region
    const searchRes = await searchChannels({ query: q, regionCode, maxResults: 10 })

    const results = (searchRes.items || []).map((item) => ({
      channelId: item.id?.channelId || item.snippet?.channelId,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
      subscriberCount: null,
    }))

    return jsonResponse({ results })
  } catch (err) {
    console.error('Search error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
