import { REGIONS } from '../../utils/regionCodes'
import { useRankingStore } from '../../store/rankingStore'
import { useT } from '../../i18n/useT'

export default function RegionFilter() {
  const { region, setRegion } = useRankingStore()
  const { t } = useT()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="region" className="text-sm text-zinc-500 dark:text-zinc-400">
        {t('home.region')}
      </label>
      <select
        id="region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {t(`region.${r.id}`)}
          </option>
        ))}
      </select>
    </div>
  )
}
