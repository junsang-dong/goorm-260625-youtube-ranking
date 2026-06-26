import { create } from 'zustand'

const THEME_KEY = 'playrank_theme'
const LANG_KEY = 'playrank_lang'

export const SUPPORTED_LANGS = ['en', 'ko', 'ja', 'zh']

function getInitialTheme() {
  if (typeof localStorage === 'undefined') return 'dark'
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'dark'
}

function getInitialLang() {
  if (typeof localStorage === 'undefined') return 'en'
  const saved = localStorage.getItem(LANG_KEY)
  return SUPPORTED_LANGS.includes(saved) ? saved : 'en'
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

// Apply persisted theme as early as possible (module import time).
applyTheme(getInitialTheme())

export const useUIStore = create((set) => ({
  theme: getInitialTheme(),
  lang: getInitialLang(),

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next)
      applyTheme(next)
      return { theme: next }
    }),

  setLang: (lang) => {
    if (!SUPPORTED_LANGS.includes(lang)) return
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang)
    set({ lang })
  },
}))
