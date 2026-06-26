import { useEffect, useState } from 'react'
import { useFavoriteStore } from '../store/favoriteStore'
import { formatNumber } from '../utils/popularityScore'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ChannelModal from '../components/channel/ChannelModal'
import FavoriteButton from '../components/common/FavoriteButton'
import { useT } from '../i18n/useT'

export default function FavoritesPage() {
  const { favorites, loading, fetchFavorites } = useFavoriteStore()
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const { t } = useT()

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('fav.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('fav.subtitle')}</p>
      </div>

      {loading && <LoadingSkeleton count={3} />}

      {!loading && favorites.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {t('fav.empty')}
        </div>
      )}

      <div className="space-y-3">
        {favorites.map((ch) => (
          <div
            key={ch.channelId}
            onClick={() => setSelectedChannelId(ch.channelId)}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-red-500/50 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <img
              src={ch.thumbnailUrl}
              alt={ch.title}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-zinc-900 dark:text-white">{ch.title}</h3>
              <p className="text-sm text-zinc-500">
                {t('card.subscribers')} {formatNumber(ch.subscriberCount)} · {t('card.views')}{' '}
                {formatNumber(ch.viewCount)}
              </p>
            </div>
            <FavoriteButton channel={ch} />
          </div>
        ))}
      </div>

      {selectedChannelId && (
        <ChannelModal
          channelId={selectedChannelId}
          onClose={() => setSelectedChannelId(null)}
        />
      )}
    </div>
  )
}
