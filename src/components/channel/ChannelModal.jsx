import { useChannel } from '../../hooks/useChannel'
import { formatNumber } from '../../utils/popularityScore'
import FavoriteButton from '../common/FavoriteButton'
import AIInsightPanel from './AIInsightPanel'
import LoadingSkeleton from '../common/LoadingSkeleton'

function StatItem({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  )
}

export default function ChannelModal({ channelId, onClose }) {
  const { channel, loading, error } = useChannel(channelId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <h2 className="text-lg font-bold text-white">채널 상세 분석</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && <LoadingSkeleton count={1} />}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
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
                    <h3 className="text-xl font-bold text-white">{channel.title}</h3>
                    <FavoriteButton
                      channel={{
                        channelId: channel.channelId,
                        title: channel.title,
                        thumbnailUrl: channel.thumbnailUrl,
                      }}
                    />
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                    {channel.description || '설명 없음'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-300">기본 정보</h4>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <StatItem label="국가" value={channel.country} />
                  <StatItem label="언어" value={channel.defaultLanguage} />
                  <StatItem
                    label="개설일"
                    value={
                      channel.publishedAt
                        ? new Date(channel.publishedAt).toLocaleDateString('ko-KR')
                        : '-'
                    }
                  />
                  <StatItem label="태그" value={channel.tags?.join(', ') || '-'} />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-300">성장 지표</h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem label="구독자" value={channel.subscriberCount} />
                  <StatItem label="총 조회수" value={channel.viewCount} />
                  <StatItem label="영상 수" value={channel.videoCount} />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-300">참여 지표</h4>
                <div className="grid grid-cols-3 gap-3">
                  <StatItem label="평균 조회수" value={channel.avgViews} />
                  <StatItem label="평균 좋아요" value={channel.avgLikes} />
                  <StatItem label="추정 참여율" value={channel.engagementRate} />
                </div>
              </div>

              <div className="mt-6">
                <a
                  href={channel.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  YouTube에서 보기 →
                </a>
              </div>

              <AIInsightPanel channel={channel} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
