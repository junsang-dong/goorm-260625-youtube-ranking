const DAILY_LIMIT = 10

function todayKey() {
  return `insight_count_${new Date().toISOString().slice(0, 10)}`
}

export function getInsightRemaining() {
  const used = Number(localStorage.getItem(todayKey()) || 0)
  return Math.max(0, DAILY_LIMIT - used)
}

export function canRequestInsight() {
  return getInsightRemaining() > 0
}

export function incrementInsightCount() {
  const key = todayKey()
  const used = Number(localStorage.getItem(key) || 0)
  localStorage.setItem(key, String(used + 1))
}

export function getInsightDailyLimit() {
  return DAILY_LIMIT
}
