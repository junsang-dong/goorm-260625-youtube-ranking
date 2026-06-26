import { useState, useEffect } from 'react'
import { useRanking } from '../hooks/useRanking'
import { useRankingStore } from '../store/rankingStore'
import { useFavoriteStore } from '../store/favoriteStore'
import { useT } from '../i18n/useT'
import CategoryTabs from '../components/ranking/CategoryTabs'
import RegionFilter from '../components/ranking/RegionFilter'
import RankingList from '../components/ranking/RankingList'
import ChannelModal from '../components/channel/ChannelModal'

const INITIAL_COUNT = 24
const STEP = 12

export default function HomePage() {
  const { channels, loading, error, category, region, fromCache, cachedAt } = useRankingStore()
  const { fetchFavorites } = useFavoriteStore()
  const { t } = useT()
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)

  useRanking()

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Reset pagination whenever the category/region filter changes.
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
  }, [category, region])

  function formatTimeAgo(isoString) {
    if (!isoString) return ''
    const diff = Date.now() - new Date(isoString).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return t('time.justNow')
    if (hours < 24) return t('time.hoursAgo', { h: hours })
    return t('time.daysAgo', { d: Math.floor(hours / 24) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('home.title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('home.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryTabs />
        <RegionFilter />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>
          {t(`cat.${category}`)} · {t(`region.${region}`)}
          {fromCache && ` · ${t('home.cache')}`}
        </span>
        {cachedAt && <span>{t('home.updated', { time: formatTimeAgo(cachedAt) })}</span>}
      </div>

      <RankingList
        channels={channels}
        loading={loading}
        error={error}
        categoryLabel={t(`cat.${category}`)}
        onChannelClick={(ch) => setSelectedChannelId(ch.channelId)}
        visibleCount={visibleCount}
        onLoadMore={() => setVisibleCount((c) => c + STEP)}
      />

      {selectedChannelId && (
        <ChannelModal
          channelId={selectedChannelId}
          onClose={() => setSelectedChannelId(null)}
        />
      )}
    </div>
  )
}
