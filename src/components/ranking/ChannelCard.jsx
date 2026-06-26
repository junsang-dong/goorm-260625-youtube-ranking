import { formatNumber } from '../../utils/popularityScore'
import FavoriteButton from '../common/FavoriteButton'
import { useT } from '../../i18n/useT'

const BADGE_STYLES = {
  up: 'bg-green-500/20 text-green-600 dark:text-green-400',
  down: 'bg-red-500/20 text-red-600 dark:text-red-400',
  new: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  same: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-500',
}

export default function ChannelCard({ channel, categoryLabel, onClick }) {
  const { t } = useT()
  const badge = channel.rankChange || { type: 'same', label: '-' }

  return (
    <div
      onClick={() => onClick(channel)}
      className="group cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-red-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
    >
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {channel.rank}
          </span>
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            className="h-16 w-16 rounded-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-zinc-900 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">
              {channel.title}
            </h3>
            <FavoriteButton channel={channel} />
          </div>

          {categoryLabel && (
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {categoryLabel}
            </span>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{t('card.subscribers')} {formatNumber(channel.subscriberCount)}</span>
            <span>{t('card.views')} {formatNumber(channel.viewCount)}</span>
            <span>{t('card.videos')} {formatNumber(channel.videoCount)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {t('card.popularity')} {formatNumber(channel.popularityScore)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[badge.type]}`}
            >
              {badge.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
