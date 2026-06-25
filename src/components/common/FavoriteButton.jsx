import { useFavoriteStore } from '../../store/favoriteStore'

export default function FavoriteButton({ channel, className = '' }) {
  const { isFavorite, toggleFavorite } = useFavoriteStore()
  const fav = isFavorite(channel.channelId)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(channel)
      }}
      className={`rounded-full p-1.5 transition-colors hover:bg-zinc-800 ${className}`}
      aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <span className={`text-lg ${fav ? 'text-yellow-400' : 'text-zinc-500'}`}>
        {fav ? '★' : '☆'}
      </span>
    </button>
  )
}
