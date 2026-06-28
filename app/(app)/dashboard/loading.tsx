export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[88px] animate-pulse" />
        ))}
      </div>
      <div className="glass-card h-44 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card h-[68px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
