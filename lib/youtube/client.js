const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'

function getApiKey() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set')
  return key
}

async function youtubeFetch(endpoint, params) {
  const url = new URL(`${YOUTUBE_BASE}/${endpoint}`)
  url.searchParams.set('key', getApiKey())
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `YouTube API error: ${res.status}`)
  }
  return res.json()
}

export async function getPopularVideos({ categoryId, regionCode, maxResults = 50 }) {
  const params = {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    maxResults,
  }
  if (categoryId) params.videoCategoryId = categoryId
  if (regionCode) params.regionCode = regionCode
  return youtubeFetch('videos', params)
}

export async function searchVideos({ categoryId, regionCode, query, maxResults = 50 }) {
  const params = {
    part: 'snippet',
    type: 'video',
    order: 'viewCount',
    maxResults,
    videoCategoryId: categoryId,
  }
  if (regionCode) params.regionCode = regionCode
  if (query) params.q = query
  return youtubeFetch('search', params)
}

export async function searchChannels({ query, regionCode, maxResults = 10 }) {
  const params = {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults,
  }
  if (regionCode) params.regionCode = regionCode
  return youtubeFetch('search', params)
}

export async function getChannels(channelIds) {
  if (!channelIds.length) return { items: [] }
  return youtubeFetch('channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    id: channelIds.join(','),
    maxResults: 50,
  })
}

// Resolve a channel by its @handle (e.g. "@anthropic-ai"). Falls back to the
// legacy forUsername lookup when the handle query returns nothing.
export async function getChannelByHandle(handle) {
  const normalized = handle.startsWith('@') ? handle : `@${handle}`
  const byHandle = await youtubeFetch('channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    forHandle: normalized,
    maxResults: 1,
  })
  if (byHandle.items?.length) return byHandle

  return youtubeFetch('channels', {
    part: 'snippet,statistics,brandingSettings,contentDetails',
    forUsername: normalized.replace(/^@/, ''),
    maxResults: 1,
  })
}

export async function getChannelVideos(channelId, maxResults = 10) {
  return youtubeFetch('search', {
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults,
  })
}

export async function getVideos(videoIds) {
  if (!videoIds.length) return { items: [] }
  return youtubeFetch('videos', {
    part: 'snippet,statistics',
    id: videoIds.join(','),
    maxResults: 50,
  })
}

export function parseCount(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatStat(value) {
  const n = parseCount(value)
  return n === null ? '-' : n
}
