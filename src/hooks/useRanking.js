import { useEffect } from 'react'
import { useRankingStore } from '../store/rankingStore'

export function useRanking() {
  const { category, region, setChannels, setLoading, setError } = useRankingStore()

  useEffect(() => {
    let cancelled = false

    async function fetchRanking() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ category, region, limit: '48' })
        const res = await fetch(`/api/ranking?${params}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch ranking')
        if (!cancelled) setChannels(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    fetchRanking()
    return () => { cancelled = true }
  }, [category, region, setChannels, setLoading, setError])
}
