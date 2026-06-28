import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/types/interview";

/** mm:ss elapsed since the first turn, for a transcript timestamp. */
function elapsed(base: number | undefined, ts: number | undefined): string | null {
  if (base === undefined || ts === undefined) return null;
  const secs = Math.max(0, Math.round((ts - base) / 1000));
  return `${Math.floor(secs / 60)
    .toString()
    .padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
}

/**
 * Static transcript render for the replay (the interview is over). Server
 * component — a dark chat timeline with interviewer (left) and candidate (right)
 * bubbles, matching the legacy replay.
 */
export function TranscriptTimeline({
  transcript,
  interviewerName = "Interviewer",
}: {
  transcript: TranscriptEntry[] | null;
  interviewerName?: string;
}) {
  const turns = (transcript ?? []).filter((e) => e.role !== "system");

  if (turns.length === 0) {
    return <p className="text-muted-foreground text-sm">No transcript was recorded for this interview.</p>;
  }

  const base = turns[0]?.timestamp;

  return (
    <ol className="space-y-4">
      {turns.map((entry, index) => {
        const isUser = entry.role === "user";
        const time = elapsed(base, entry.timestamp);
        return (
          <li key={index} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                isUser ? "from-blue-400 to-cyan-400" : "from-purple-400 to-pink-400",
              )}
            >
              {isUser ? "U" : interviewerName.charAt(0)}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl border p-3 text-sm",
                isUser ? "border-blue-500/30 bg-blue-500/10" : "border-white/10 bg-white/5",
              )}
            >
              {time ? (
                <p className="mb-1 font-mono text-[10px] text-gray-400">{time}</p>
              ) : null}
              <p className="leading-relaxed whitespace-pre-wrap text-gray-200">{entry.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
