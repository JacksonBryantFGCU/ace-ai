import type { Metadata } from "next";

export const metadata: Metadata = {
  // generateMetadata will set a per-interview title in Phase 2.
  title: "Interview replay",
};

export default async function InterviewReplayPage(props: PageProps<"/interviews/[id]">) {
  const { id } = await props.params;

  // TODO(P2): server read by id, owner-scoped; `notFound()` on miss; render the
  // transcript timeline + scores as server markup.
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Interview replay</h1>
      <p className="text-muted-foreground text-sm">
        Replay for interview <code className="font-mono">{id}</code> will appear here.
      </p>
    </div>
  );
}
