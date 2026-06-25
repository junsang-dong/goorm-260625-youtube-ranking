import { create } from 'zustand'
import { getSessionId } from '../utils/session'

export const useFavoriteStore = create((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  loading: false,

  fetchFavorites: async () => {
    set({ loading: true })
    try {
      const sessionId = getSessionId()
      const res = await fetch(`/api/favorites?sessionId=${sessionId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ids = new Set(data.favorites.map((f) => f.channelId))
      set({ favorites: data.favorites, favoriteIds: ids, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  toggleFavorite: async (channel) => {
    const sessionId = getSessionId()
    const { favoriteIds } = get()
    const isFav = favoriteIds.has(channel.channelId)
    const action = isFav ? 'remove' : 'add'

    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        channelId: channel.channelId,
        action,
        title: channel.title,
        thumbnailUrl: channel.thumbnailUrl,
      }),
    })

    if (!res.ok) return
    await get().fetchFavorites()
  },

  isFavorite: (channelId) => get().favoriteIds.has(channelId),
}))
