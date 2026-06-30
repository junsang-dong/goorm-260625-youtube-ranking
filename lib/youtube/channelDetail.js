import {
  getChannels,
  getChannelByHandle,
  getChannelVideos,
  getVideos,
  parseCount,
  formatStat,
} from './client.js'

function calcEngagement(avgViews, subscribers) {
  if (!subscribers || subscribers === 0 || !avgViews) return null
  return ((avgViews / subscribers) * 100).toFixed(2)
}

const CHANNEL_ID_RE = /^UC[\w-]{20,}$/

// Resolve a raw identifier (UC channel id or @handle) to a channel resource.
async function resolveChannel(identifier) {
  if (CHANNEL_ID_RE.test(identifier)) {
    return getChannels([identifier])
  }
  return getChannelByHandle(identifier)
}

/**
 * Fetch and assemble a channel's detail payload from the YouTube Data API.
 * Accepts either a UC channel id or an @handle. Returns both display-ready
 * fields (formatted strings) and raw numeric fields (suffixed with `Num`) so
 * callers like the multi-LLM analyzer can feed accurate numbers into prompts.
 */
export async function fetchChannelDetail(channelId) {
  const channelsRes = await resolveChannel(channelId)

  const ch = channelsRes.items?.[0]
  if (!ch) throw new Error('Channel not found')

  // Recent videos must be fetched with the resolved channel id (a handle has
  // no videos endpoint of its own).
  const videosSearchRes = await getChannelVideos(ch.id, 10)

  const stats = ch.statistics || {}
  const snippet = ch.snippet || {}
  const branding = ch.brandingSettings?.channel || {}

  const videoIds = (videosSearchRes.items || [])
    .map((v) => v.id?.videoId)
    .filter(Boolean)

  let avgViews = null
  let avgLikes = null
  let engagementRate = null

  const subsNum = parseCount(stats.subscriberCount)

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
    engagementRate = calcEngagement(avgViews, subsNum)
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
    // Raw numeric fields for downstream analysis (null when unavailable).
    subscriberCountNum: subsNum,
    viewCountNum: parseCount(stats.viewCount),
    videoCountNum: parseCount(stats.videoCount),
    avgViewsNum: avgViews,
    avgLikesNum: avgLikes,
    engagementRateNum: engagementRate ? Number(engagementRate) : null,
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
