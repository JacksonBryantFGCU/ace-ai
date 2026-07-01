export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-80 max-w-full animate-pulse rounded-md" />
      </div>
      <div className="glass-card h-32 animate-pulse" />
      <div className="glass-card h-40 animate-pulse" />
      <div className="glass-card h-56 animate-pulse" />
    </div>
  );
}
