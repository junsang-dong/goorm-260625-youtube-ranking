import { REGIONS } from '../../utils/regionCodes'
import { useRankingStore } from '../../store/rankingStore'

export default function RegionFilter() {
  const { region, setRegion } = useRankingStore()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="region" className="text-sm text-zinc-400">
        국가
      </label>
      <select
        id="region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
      >
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  )
}
