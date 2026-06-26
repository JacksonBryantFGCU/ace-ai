export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-8 w-40 animate-pulse rounded-md" />
      <div className="bg-muted h-72 animate-pulse rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
