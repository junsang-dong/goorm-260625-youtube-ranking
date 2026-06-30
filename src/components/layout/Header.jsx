import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '../../store/uiStore'
import { useT } from '../../i18n/useT'
import { LANG_OPTIONS } from '../../i18n/translations'

export default function Header() {
  const location = useLocation()
  const { t, lang } = useT()
  const { theme, toggleTheme, setLang } = useUIStore()
  const title = import.meta.env.VITE_APP_TITLE || 'PlayRank'

  const NAV = [
    { to: '/', label: t('nav.home') },
    { to: '/search', label: t('nav.search') },
    { to: '/intelligence', label: t('nav.intelligence') },
    { to: '/favorites', label: t('nav.favorites') },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{title}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active
                      ? 'bg-red-600/15 text-red-600 dark:bg-red-600/20 dark:text-red-400'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <label className="sr-only" htmlFor="lang-select">
            {t('lang.label')}
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t('lang.label')}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span className="block text-base leading-none">
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
