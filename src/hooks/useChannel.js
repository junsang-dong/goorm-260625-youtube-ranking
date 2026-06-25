import { useState, useEffect, useCallback } from 'react'

export function useChannel(channelId) {
  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchChannel = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/channel/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch channel')
      setChannel(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (channelId) fetchChannel(channelId)
  }, [channelId, fetchChannel])

  return { channel, loading, error, refetch: () => fetchChannel(channelId) }
}
