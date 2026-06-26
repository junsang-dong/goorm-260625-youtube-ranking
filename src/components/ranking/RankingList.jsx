import ChannelCard from './ChannelCard'
import LoadingSkeleton from '../common/LoadingSkeleton'
import { useT } from '../../i18n/useT'

export default function RankingList({
  channels,
  loading,
  error,
  categoryLabel,
  onChannelClick,
  visibleCount,
  onLoadMore,
}) {
  const { t } = useT()

  if (loading) return <LoadingSkeleton count={6} />

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <p className="mt-2 text-sm text-zinc-500">{t('ranking.errorHint')}</p>
      </div>
    )
  }

  if (!channels.length) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        {t('ranking.empty')}
      </div>
    )
  }

  const visible = visibleCount ? channels.slice(0, visibleCount) : channels
  const hasMore = visibleCount && visibleCount < channels.length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((channel) => (
          <ChannelCard
            key={channel.channelId}
            channel={channel}
            categoryLabel={categoryLabel}
            onClick={onChannelClick}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            className="rounded-full border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-red-500 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-red-500 dark:hover:text-red-400"
          >
            {t('home.loadMore')} ({visibleCount}/{channels.length})
          </button>
        </div>
      )}
    </div>
  )
}
