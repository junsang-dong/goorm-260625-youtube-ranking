export default function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
              <div className="h-3 w-full rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
