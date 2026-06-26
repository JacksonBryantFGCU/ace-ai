export default function InterviewsLoading() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-8 w-56 animate-pulse rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
