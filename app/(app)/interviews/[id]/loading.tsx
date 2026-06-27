export default function InterviewReplayLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-48 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-40 animate-pulse rounded-lg" />
      <div className="space-y-3">
        <div className="bg-muted h-6 w-32 animate-pulse rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
