import { create } from 'zustand'

export const useRankingStore = create((set) => ({
  category: 'entertainment',
  region: 'WW',
  channels: [],
  loading: false,
  error: null,
  fromCache: false,
  cachedAt: null,
  categoryLabel: '',
  regionLabel: '',

  setCategory: (category) => set({ category }),
  setRegion: (region) => set({ region }),
  setChannels: (data) =>
    set({
      channels: data.channels,
      fromCache: data.fromCache,
      cachedAt: data.cachedAt,
      categoryLabel: data.category,
      regionLabel: data.region,
      loading: false,
      error: null,
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
