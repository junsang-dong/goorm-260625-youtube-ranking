import { CATEGORIES } from '../../utils/categories'
import { useRankingStore } from '../../store/rankingStore'
import { useT } from '../../i18n/useT'

export default function CategoryTabs() {
  const { category, setCategory } = useRankingStore()
  const { t } = useT()

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setCategory(cat.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            category === cat.id
              ? 'bg-red-600 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white'
          }`}
        >
          {t(`cat.${cat.id}`)}
        </button>
      ))}
    </div>
  )
}
