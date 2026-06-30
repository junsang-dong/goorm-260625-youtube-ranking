import { useT } from '../../i18n/useT'

function formatMs(ms) {
  if (typeof ms !== 'number') return null
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(n) {
  if (typeof n !== 'number' || n <= 0) return null
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`
}

function formatCost(usd) {
  if (typeof usd !== 'number') return null
  if (usd === 0) return '$0'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}

function MetaBadge({ meta }) {
  const { t } = useT()
  if (!meta) return null

  const time = formatMs(meta.ms)
  const tokens = formatTokens(meta.totalTokens)
  const cost = formatCost(meta.costUsd)
  if (!time && !tokens && !cost) return null

  const title = [
    meta.model && `${meta.model}`,
    time && `${t('intel.metaTime')}: ${time}`,
    typeof meta.totalTokens === 'number' &&
      `${t('intel.metaTokens')}: ${meta.totalTokens.toLocaleString()}`,
    cost && `${t('intel.metaCost')}: ${cost}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span
      title={title}
      className="flex flex-wrap items-center justify-end gap-1 text-[11px] font-normal text-zinc-500 dark:text-zinc-400"
    >
      {time && (
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{time}</span>
      )}
      {tokens && (
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
          {tokens} {t('intel.metaTokensUnit')}
        </span>
      )}
      {cost && (
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {cost}
        </span>
      )}
    </span>
  )
}

function Card({ title, accent, meta, children }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          <span className="inline-block h-2 w-2 rounded-full bg-current" />
          {title}
        </h4>
        <MetaBadge meta={meta} />
      </div>
      <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-200">{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <p>
      <span className="font-medium text-zinc-500 dark:text-zinc-400">{label}: </span>
      {value}
    </p>
  )
}

function Tags({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div>
      <span className="font-medium text-zinc-500 dark:text-zinc-400">{label}:</span>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

export default function LLMAnalysisPanel({ gpt, claude, gemini, trend, metrics = {} }) {
  const { t } = useT()

  const growthLabel = (g) =>
    g ? t(`intel.growth.${g}`) : null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {gpt && (
        <Card title={t('intel.gpt')} accent="text-emerald-600 dark:text-emerald-400" meta={metrics.gpt}>
          <Field label={t('intel.summary')} value={gpt.summary} />
          <Field label={t('intel.contentType')} value={gpt.contentType} />
          <Field label={t('intel.targetAudience')} value={gpt.targetAudience} />
          <Tags label={t('intel.strengths')} items={gpt.strengths} />
        </Card>
      )}

      {claude && (
        <Card title={t('intel.claude')} accent="text-orange-600 dark:text-orange-400" meta={metrics.claude}>
          <Field label={t('intel.strategy')} value={claude.strategy} />
          <Field label={t('intel.uniqueValue')} value={claude.uniqueValue} />
          <Field label={t('intel.growth')} value={growthLabel(claude.growthPotential)} />
          <Tags label={t('intel.risks')} items={claude.risks} />
        </Card>
      )}

      {gemini && (
        <Card title={t('intel.gemini')} accent="text-blue-600 dark:text-blue-400" meta={metrics.gemini}>
          <Field label={t('intel.primaryCategory')} value={gemini.primaryCategory} />
          <Tags label={t('intel.secondaryCategories')} items={gemini.secondaryCategories} />
          <Field label={t('intel.contentTone')} value={gemini.contentTone} />
          <Field
            label={t('intel.confidence')}
            value={
              typeof gemini.confidence === 'number'
                ? `${Math.round(gemini.confidence * 100)}%`
                : null
            }
          />
        </Card>
      )}

      {trend && (trend.currentTrends?.length || trend.competitorInsight || trend.marketOpportunity) && (
        <Card title={t('intel.perplexity')} accent="text-purple-600 dark:text-purple-400" meta={metrics.perplexity}>
          <Tags label={t('intel.currentTrends')} items={trend.currentTrends} />
          <Field label={t('intel.competitor')} value={trend.competitorInsight} />
          <Field label={t('intel.opportunity')} value={trend.marketOpportunity} />
        </Card>
      )}
    </div>
  )
}
