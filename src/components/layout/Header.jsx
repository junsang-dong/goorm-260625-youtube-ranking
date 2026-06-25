import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: '홈' },
  { to: '/search', label: '검색' },
  { to: '/favorites', label: '즐겨찾기' },
]

export default function Header() {
  const location = useLocation()
  const title = import.meta.env.VITE_APP_TITLE || 'PlayRank'

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold text-white">{title}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-red-600/20 text-red-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
