import { Component } from 'react'
import { translations } from '../../i18n/translations'

function tStatic(key) {
  let lang = 'en'
  try {
    const saved = localStorage.getItem('playrank_lang')
    if (saved && translations[saved]) lang = saved
  } catch {
    // ignore
  }
  return translations[lang][key] ?? translations.en[key] ?? key
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
              {tStatic('error.title')}
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              {tStatic('error.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
