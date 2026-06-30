import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useChannelAnalysis } from '../hooks/useChannelAnalysis'
import { useT } from '../i18n/useT'
import { LANG_OPTIONS } from '../i18n/translations'
import TrustScoreCard from '../components/intelligence/TrustScoreCard'
import LLMAnalysisPanel from '../components/intelligence/LLMAnalysisPanel'
import SynthesisReport from '../components/intelligence/SynthesisReport'

const ANALYSIS_TYPES = ['quick', 'deep', 'trend']

function formatTotalCost(usd) {
  if (typeof usd !== 'number') return '$0'
  if (usd === 0) return '$0'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}

export default function ChannelIntelligencePage() {
  const { t, lang } = useT()
  const [searchParams] = useSearchParams()
  const { report, loading, error, fromCache, processingTime, analyze } = useChannelAnalysis()

  const [channelId, setChannelId] = useState('')
  const [analysisType, setAnalysisType] = useState('deep')
  const autoRan = useRef(false)

  // Auto-run when arriving with a ?channelId= query (e.g. from a channel modal).
  useEffect(() => {
    const queryId = searchParams.get('channelId')
    if (queryId && !autoRan.current) {
      autoRan.current = true
      setChannelId(queryId)
      analyze({ channelId: queryId, analysisType: 'deep', lang })
    }
  }, [searchParams, analyze, lang])

  const handleAnalyze = () => {
    if (!channelId || loading) return
    analyze({ channelId, analysisType, lang })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('intel.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('intel.subtitle')}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <input
          type="text"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder={t('intel.inputPlaceholder')}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-500"
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            aria-label={t('intel.analysisType')}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {ANALYSIS_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`intel.type.${type}`)}
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={loading || !channelId}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-red-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? t('intel.analyzing') : t('intel.analyze')}
          </button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {t('intel.langNote', { lang: LANG_OPTIONS.find((o) => o.id === lang)?.label || lang })}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          {t('intel.analyzing')}
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
            {(fromCache || processingTime != null) && (
              <span>
                {fromCache
                  ? t('intel.cached')
                  : t('intel.processingTime', { time: processingTime })}
              </span>
            )}
            {report.metricsSummary?.llmCalls > 0 && (
              <span>
                {t('intel.totalCost', {
                  calls: report.metricsSummary.llmCalls,
                  tokens: report.metricsSummary.totalTokens.toLocaleString(),
                  cost: formatTotalCost(report.metricsSummary.totalCostUsd),
                })}
              </span>
            )}
          </div>
          <TrustScoreCard filter={report.filter} />
          <LLMAnalysisPanel
            gpt={report.analysisGPT}
            claude={report.analysisClaude}
            gemini={report.analysisGemini}
            trend={report.trendPerplexity}
            metrics={report.metrics}
          />
          <SynthesisReport synthesis={report.synthesisReport} />
        </div>
      )}
    </div>
  )
}
