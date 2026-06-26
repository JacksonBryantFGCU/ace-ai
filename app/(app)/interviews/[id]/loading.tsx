export default function InterviewReplayLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted h-12 animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
