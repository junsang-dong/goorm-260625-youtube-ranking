export function calcPopularityScore(viewCount, avgLikes = 0) {
  return Number(viewCount || 0) + Math.round((avgLikes || 0) * 10)
}

export function formatNumber(n) {
  if (n === null || n === undefined || n === '-') return '-'
  const num = Number(n)
  if (!Number.isFinite(num)) return '-'
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString('ko-KR')
}
