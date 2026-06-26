import { useState } from 'react'
import { useInsight } from '../../hooks/useInsight'
import { getInsightRemaining, getInsightDailyLimit } from '../../utils/insightLimit'
import { useT } from '../../i18n/useT'

export default function AIInsightPanel({ channel }) {
  const { insight, loading, error, fromCache, fetchInsight, reset } = useInsight()
  const [expanded, setExpanded] = useState(false)
  const { t, lang } = useT()

  if (!channel) return null

  const remaining = getInsightRemaining()
  const limit = getInsightDailyLimit()

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true)
      fetchInsight(
        channel.channelId,
        {
          title: channel.title,
          category: channel.category,
          subscriberCount: channel.subscriberCount,
          viewCount: channel.viewCount,
          videoCount: channel.videoCount,
          avgViews: channel.avgViews,
          engagementRate: channel.engagementRate,
          tags: channel.tags,
          description: channel.description,
        },
        lang,
        t('ai.limitReached'),
      )
    } else {
      setExpanded(false)
      reset()
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggle}
          disabled={remaining === 0 && !expanded}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {expanded ? t('ai.close') : t('ai.open')}
        </button>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {t('ai.remaining', { remaining, limit })}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          {loading && !insight && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              {t('ai.analyzing')}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {insight && (
            <div className="space-y-2">
              {fromCache && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{t('ai.cached')}</span>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
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
