import { Link } from 'react-router-dom'
import { useChannel } from '../../hooks/useChannel'
import { formatNumber } from '../../utils/popularityScore'
import FavoriteButton from '../common/FavoriteButton'
import AIInsightPanel from './AIInsightPanel'
import LoadingSkeleton from '../common/LoadingSkeleton'
import { useT } from '../../i18n/useT'

function StatItem({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  )
}

export default function ChannelModal({ channelId, onClose }) {
  const { channel, loading, error } = useChannel(channelId)
  const { t, lang } = useT()

  const localeMap = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{t('modal.title')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && <LoadingSkeleton count={1} />}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {channel && (
            <>
              <div className="flex items-start gap-4">
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.title}
                  className="h-20 w-20 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {channel.title}
                    </h3>
                    <FavoriteButton
                      channel={{
                        channelId: channel.channelId,
                        title: channel.title,
                        thumbnailUrl: channel.thumbnailUrl,
                      }}
                    />
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {channel.description || t('modal.noDescription')}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('modal.basicInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <StatItem label={t('modal.country')} value={channel.country} />
                  <StatItem label={t('modal.language')} value={channel.defaultLanguage} />
                  <StatItem
                    label={t('modal.publishedAt')}
                    value={
                      channel.publishedAt
                        ? new Date(channel.publishedAt).toLocaleDateString(localeMap[lang] || 'en-US')
                        : '-'
                    }
                  />
                  <StatItem label={t('modal.tags')} value={channel.tags?.join(', ') || '-'} />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('modal.growth')}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem label={t('modal.subscribers')} value={channel.subscriberCount} />
                  <StatItem label={t('modal.totalViews')} value={channel.viewCount} />
                  <StatItem label={t('modal.videoCount')} value={channel.videoCount} />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('modal.engagement')}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem label={t('modal.avgViews')} value={channel.avgViews} />
                  <StatItem label={t('modal.avgLikes')} value={channel.avgLikes} />
                  <StatItem label={t('modal.engagementRate')} value={channel.engagementRate} />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={channel.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  {t('modal.viewOnYoutube')}
                </a>
                <Link
                  to={`/intelligence?channelId=${channel.channelId}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {t('modal.deepAnalysis')}
                </Link>
              </div>

              <AIInsightPanel channel={channel} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
