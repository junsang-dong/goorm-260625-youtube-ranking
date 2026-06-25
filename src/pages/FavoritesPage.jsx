import { useEffect, useState } from 'react'
import { useFavoriteStore } from '../store/favoriteStore'
import { formatNumber } from '../utils/popularityScore'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ChannelModal from '../components/channel/ChannelModal'
import FavoriteButton from '../components/common/FavoriteButton'

export default function FavoritesPage() {
  const { favorites, loading, fetchFavorites } = useFavoriteStore()
  const [selectedChannelId, setSelectedChannelId] = useState(null)

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">즐겨찾기</h1>
        <p className="mt-1 text-sm text-zinc-400">관심 채널을 빠르게 확인하세요.</p>
      </div>

      {loading && <LoadingSkeleton count={3} />}

      {!loading && favorites.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
          즐겨찾기한 채널이 없습니다. 랭킹에서 ★ 버튼을 눌러 추가하세요.
        </div>
      )}

      <div className="space-y-3">
        {favorites.map((ch) => (
          <div
            key={ch.channelId}
            onClick={() => setSelectedChannelId(ch.channelId)}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-red-500/50"
          >
            <img
              src={ch.thumbnailUrl}
              alt={ch.title}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-white">{ch.title}</h3>
              <p className="text-sm text-zinc-500">
                구독자 {formatNumber(ch.subscriberCount)} · 조회수 {formatNumber(ch.viewCount)}
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
