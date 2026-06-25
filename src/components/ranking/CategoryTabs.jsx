import { CATEGORIES } from '../../utils/categories'
import { useRankingStore } from '../../store/rankingStore'

export default function CategoryTabs() {
  const { category, setCategory } = useRankingStore()

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setCategory(cat.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            category === cat.id
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
