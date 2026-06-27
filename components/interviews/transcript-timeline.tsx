import type { TranscriptEntry } from "@/types/interview";

const SPEAKER_LABEL: Record<TranscriptEntry["role"], string> = {
  assistant: "Interviewer",
  user: "You",
  system: "System",
};

/** Static transcript render (the interview is over). Server component. */
export function TranscriptTimeline({ transcript }: { transcript: TranscriptEntry[] | null }) {
  if (!transcript || transcript.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No transcript was recorded for this interview.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {transcript.map((entry, index) => (
        <li key={index} className={entry.role === "user" ? "sm:pl-8" : undefined}>
          <div
            className={`rounded-lg border p-3 text-sm ${
              entry.role === "user"
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-muted/40"
            }`}
          >
            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
              {SPEAKER_LABEL[entry.role]}
            </p>
            <p className="leading-relaxed whitespace-pre-wrap">{entry.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
