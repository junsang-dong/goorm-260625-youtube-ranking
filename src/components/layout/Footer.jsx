import { useT } from '../../i18n/useT'

const RELEASE_DATE = '2026.06.26'
const COMPANY = 'Jay.NextPlatform'
const STACK = [
  'React 19',
  'Vite 6',
  'Tailwind CSS v4',
  'Zustand',
  'Vercel Serverless',
  'Neon PostgreSQL',
  'YouTube Data API v3',
  'Gemini 2.5 Flash',
]

export default function Footer() {
  const { t } = useT()

  return (
    <footer className="mt-8 border-t border-zinc-200 bg-white/50 py-6 text-zinc-500 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-500">
      <div className="mx-auto max-w-7xl space-y-4 px-4 text-center sm:px-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('footer.tagline')}
          </p>
          <p className="text-xs">{t('footer.dataInfo')}</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 text-xs sm:flex-row sm:gap-4">
          <span>
            <span className="text-zinc-400 dark:text-zinc-600">{t('footer.released')}:</span>{' '}
            {RELEASE_DATE}
          </span>
          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
          <span>
            <span className="text-zinc-400 dark:text-zinc-600">{t('footer.developedBy')}:</span>{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{COMPANY}</span>
          </span>
        </div>

        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-600">{t('footer.stack')}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
          © 2026 {COMPANY}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
