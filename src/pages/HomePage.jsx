import { useState, useEffect } from 'react'
import { useRanking } from '../hooks/useRanking'
import { useRankingStore } from '../store/rankingStore'
import { useFavoriteStore } from '../store/favoriteStore'
import CategoryTabs from '../components/ranking/CategoryTabs'
import RegionFilter from '../components/ranking/RegionFilter'
import RankingList from '../components/ranking/RankingList'
import ChannelModal from '../components/channel/ChannelModal'

function formatTimeAgo(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export default function HomePage() {
  const { channels, loading, error, categoryLabel, regionLabel, fromCache, cachedAt } =
    useRankingStore()
  const { fetchFavorites } = useFavoriteStore()
  const [selectedChannelId, setSelectedChannelId] = useState(null)

  useRanking()

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">
          YouTube 채널 랭킹
        </h1>
        <p className="text-sm text-zinc-400">
          지금 YouTube에서 실제로 뜨는 채널이 어디인지, AI가 그 이유까지 설명해줍니다.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryTabs />
        <RegionFilter />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {categoryLabel} · {regionLabel}
          {fromCache && ' · 캐시'}
        </span>
        {cachedAt && <span>업데이트: {formatTimeAgo(cachedAt)}</span>}
      </div>

      <RankingList
        channels={channels}
        loading={loading}
        error={error}
        categoryLabel={categoryLabel}
        onChannelClick={(ch) => setSelectedChannelId(ch.channelId)}
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
