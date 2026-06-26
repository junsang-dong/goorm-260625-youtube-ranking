import { useState, useEffect, useCallback } from 'react'
import ChannelModal from '../components/channel/ChannelModal'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import FavoriteButton from '../components/common/FavoriteButton'
import { useFavoriteStore } from '../store/favoriteStore'
import { useT } from '../i18n/useT'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const { fetchFavorites } = useFavoriteStore()
  const { t } = useT()

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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('search.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('search.subtitle')}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
      />

      {loading && <LoadingSkeleton count={3} />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && debouncedQuery && results.length === 0 && (
        <p className="text-center text-zinc-500">{t('search.noResults')}</p>
      )}

      <div className="space-y-3">
        {results.map((ch) => (
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
