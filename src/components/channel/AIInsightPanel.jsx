import { useState } from 'react'
import { useInsight } from '../../hooks/useInsight'
import { getInsightRemaining, getInsightDailyLimit } from '../../utils/insightLimit'

export default function AIInsightPanel({ channel }) {
  const { insight, loading, error, fromCache, fetchInsight, reset } = useInsight()
  const [expanded, setExpanded] = useState(false)

  if (!channel) return null

  const remaining = getInsightRemaining()
  const limit = getInsightDailyLimit()

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true)
      fetchInsight(channel.channelId, {
        title: channel.title,
        category: channel.category,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        avgViews: channel.avgViews,
        engagementRate: channel.engagementRate,
        tags: channel.tags,
        description: channel.description,
      })
    } else {
      setExpanded(false)
      reset()
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggle}
          disabled={remaining === 0 && !expanded}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {expanded ? 'AI 인사이트 닫기' : '✨ AI 인사이트 보기'}
        </button>
        <span className="text-xs text-zinc-500">
          오늘 {remaining}/{limit}회 남음
        </span>
      </div>

      {expanded && (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          {loading && !insight && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              AI가 분석 중입니다...
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {insight && (
            <div className="space-y-2">
              {fromCache && (
                <span className="text-xs text-zinc-500">캐시된 인사이트 (24h)</span>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {insight}
                {loading && (
                  <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-purple-400" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
