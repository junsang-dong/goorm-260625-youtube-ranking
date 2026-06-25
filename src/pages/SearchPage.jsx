import { useState, useEffect, useCallback } from 'react'
import ChannelModal from '../components/channel/ChannelModal'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import FavoriteButton from '../components/common/FavoriteButton'
import { useFavoriteStore } from '../store/favoriteStore'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const { fetchFavorites } = useFavoriteStore()

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const search = useCallback(async (q) => {
    if (!q) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    search(debouncedQuery)
  }, [debouncedQuery, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">채널 검색</h1>
        <p className="mt-1 text-sm text-zinc-400">채널명으로 YouTube 채널을 검색하세요.</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="채널명 입력..."
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
      />

      {loading && <LoadingSkeleton count={3} />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && debouncedQuery && results.length === 0 && (
        <p className="text-center text-zinc-500">검색 결과가 없습니다.</p>
      )}

      <div className="space-y-3">
        {results.map((ch) => (
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
              <p className="truncate text-sm text-zinc-500">{ch.description}</p>
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
