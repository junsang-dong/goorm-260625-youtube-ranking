import { useState, useCallback } from 'react'

// Normalizes raw input into either a UC channel id or an @handle.
// Accepts: channel URLs (/channel/UC...), handle URLs (/@handle or bare
// @handle), legacy custom URLs (/c/Name, /user/Name), and bare ids/names.
export function parseChannelId(input) {
  if (!input) return ''
  const value = input.trim()

  const channelMatch = value.match(/channel\/(UC[\w-]+)/)
  if (channelMatch) return channelMatch[1]

  if (/^UC[\w-]{20,}$/.test(value)) return value

  const handleMatch = value.match(/@([A-Za-z0-9._-]+)/)
  if (handleMatch) return `@${handleMatch[1]}`

  const customMatch = value.match(/\/(?:c|user)\/([A-Za-z0-9._-]+)/)
  if (customMatch) return `@${customMatch[1]}`

  return value
}

export function useChannelAnalysis() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [processingTime, setProcessingTime] = useState(null)

  const analyze = useCallback(async ({ channelId, analysisType = 'deep', lang = 'en' }) => {
    const id = parseChannelId(channelId)
    if (!id) {
      setError('Channel ID required')
      return
    }

    setLoading(true)
    setError(null)
    setReport(null)
    setFromCache(false)
    setProcessingTime(null)

    try {
      const res = await fetch('/api/analyze-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: id, analysisType, lang }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      setReport(data.report)
      setFromCache(Boolean(data.cached))
      setProcessingTime(data.processingTime ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setReport(null)
    setError(null)
    setFromCache(false)
    setProcessingTime(null)
  }, [])

  return { report, loading, error, fromCache, processingTime, analyze, reset }
}
