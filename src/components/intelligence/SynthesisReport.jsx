import { useT } from '../../i18n/useT'

const REC_STYLES = {
  highly_recommended: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  recommended: 'bg-green-500/15 text-green-600 dark:text-green-400',
  neutral: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  not_recommended: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

export default function SynthesisReport({ synthesis }) {
  const { t } = useT()
  if (!synthesis) return null

  const rec = synthesis.recommendation || 'neutral'
  const recStyle = REC_STYLES[rec] || REC_STYLES.neutral

  return (
    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          {t('intel.synthesis')}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${recStyle}`}>
          {t(`intel.rec.${rec}`)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-zinc-900 dark:text-white">
          {synthesis.overallScore ?? 0}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">/100</span>
      </div>

      {synthesis.executiveSummary && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          {synthesis.executiveSummary}
        </p>
      )}

      {Array.isArray(synthesis.keyInsights) && synthesis.keyInsights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t('intel.keyInsights')}
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
            {synthesis.keyInsights.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(synthesis.recommendations) && synthesis.recommendations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t('intel.recommendations')}
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
            {synthesis.recommendations.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
