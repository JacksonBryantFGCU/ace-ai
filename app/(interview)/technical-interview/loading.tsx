/** Shown while the route resolves/generates the coding problems. */
export default function TechnicalInterviewLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 size-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
      <p className="text-lg font-medium text-gray-300">Preparing your coding problems…</p>
      <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
    </div>
  );
}
