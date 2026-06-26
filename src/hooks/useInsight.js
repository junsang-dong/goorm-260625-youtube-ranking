import { useState, useCallback } from 'react'
import { canRequestInsight, incrementInsightCount } from '../utils/insightLimit'

export function useInsight() {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchInsight = useCallback(async (channelId, channelData, lang = 'en', limitMessage) => {
    if (!canRequestInsight()) {
      setError(limitMessage || 'Daily AI insight limit reached.')
      return
    }

    setLoading(true)
    setError(null)
    setInsight('')
    setFromCache(false)

    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, channelData, lang }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch insight')
      }

      setFromCache(res.headers.get('X-Cache') === 'HIT')
      incrementInsightCount()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setInsight(text)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setInsight('')
    setError(null)
    setFromCache(false)
  }, [])

  return { insight, loading, error, fromCache, fetchInsight, reset }
}
