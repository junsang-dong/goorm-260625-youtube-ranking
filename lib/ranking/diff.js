/**
 * Calculate rank change between yesterday and today.
 * @returns {{ type: 'up'|'down'|'new'|'same', delta: number }}
 */
export function calcRankChange(todayRank, yesterdayRank) {
  if (yesterdayRank == null) {
    return { type: 'new', delta: 0, label: 'NEW' }
  }
  const diff = yesterdayRank - todayRank
  if (diff > 0) {
    return { type: 'up', delta: diff, label: `▲ ${diff}` }
  }
  if (diff < 0) {
    return { type: 'down', delta: Math.abs(diff), label: `▼ ${Math.abs(diff)}` }
  }
  return { type: 'same', delta: 0, label: '-' }
}

export function buildYesterdayRankMap(rows) {
  const map = new Map()
  for (const row of rows) {
    map.set(row.channel_id, row.rank)
  }
  return map
}
