export default function NewInterviewLoading() {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-12 space-y-3 text-center">
        <div className="bg-muted mx-auto h-10 w-96 max-w-full animate-pulse rounded-md" />
        <div className="bg-muted mx-auto h-5 w-72 max-w-full animate-pulse rounded-md" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-28 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
