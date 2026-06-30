import { useT } from '../../i18n/useT'

export default function TrustScoreCard({ filter }) {
  const { t } = useT()
  if (!filter) return null

  const score = Math.round((filter.score || 0) * 100)
  const barColor =
    score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          {t('intel.trustScore')}
        </h3>
        <span className="text-lg font-bold text-zinc-900 dark:text-white">{score}/100</span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>

      {filter.reason && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{filter.reason}</p>
      )}

      {Array.isArray(filter.flags) && filter.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t('intel.flags')}:
          </span>
          {filter.flags.map((flag) => (
            <span
              key={flag}
              className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
