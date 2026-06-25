import ChannelCard from './ChannelCard'
import LoadingSkeleton from '../common/LoadingSkeleton'

export default function RankingList({ channels, loading, error, categoryLabel, onChannelClick }) {
  if (loading) return <LoadingSkeleton count={6} />

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="mt-2 text-sm text-zinc-500">
          API 키와 데이터베이스 연결을 확인해 주세요.
        </p>
      </div>
    )
  }

  if (!channels.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
        랭킹 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.channelId}
          channel={channel}
          categoryLabel={categoryLabel}
          onClick={onChannelClick}
        />
      ))}
    </div>
  )
}
