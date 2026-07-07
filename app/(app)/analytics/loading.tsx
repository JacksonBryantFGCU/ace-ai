export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="h-7 w-40 animate-pulse rounded-md bg-white/10" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-white/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-white/10 bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/5" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );
}
