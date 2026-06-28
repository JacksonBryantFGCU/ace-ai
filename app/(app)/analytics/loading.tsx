export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="bg-muted h-8 w-40 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-72 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[88px] animate-pulse" />
        ))}
      </div>
      <div className="glass-card h-80 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
