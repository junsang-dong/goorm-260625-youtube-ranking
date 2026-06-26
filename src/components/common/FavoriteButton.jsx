import { useFavoriteStore } from '../../store/favoriteStore'
import { useT } from '../../i18n/useT'

export default function FavoriteButton({ channel, className = '' }) {
  const { isFavorite, toggleFavorite } = useFavoriteStore()
  const { t } = useT()
  const fav = isFavorite(channel.channelId)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(channel)
      }}
      className={`rounded-full p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className}`}
      aria-label={fav ? t('fav.remove') : t('fav.add')}
    >
      <span className={`text-lg ${fav ? 'text-yellow-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
        {fav ? '★' : '☆'}
      </span>
    </button>
  )
}
