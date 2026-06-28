import { Loader2, Volume2 } from "lucide-react";

/** Persona display copy for each interviewer (ported verbatim from the legacy
 *  `InterviewerCard`). Keyed by interviewer id. */
interface InterviewerDisplay {
  style: string;
  description: string;
  traits: string[];
  badgeClass: string;
  accentClass: string;
}

const INTERVIEWER_DISPLAY: Record<string, InterviewerDisplay> = {
  cassidy: {
    style: "Conversational",
    description:
      "Builds rapport quickly and makes you feel at ease — then turns up the heat with pointed follow-ups. Warm and supportive on the surface, but won't let vague or weak answers slide.",
    traits: ["Warm", "Encouraging", "Probing", "Personable"],
    badgeClass: "bg-purple-100 text-purple-700",
    accentClass: "text-purple-500",
  },
  alex: {
    style: "Formal",
    description:
      "Direct, precise, and strictly technical. Expects structured thinking and concise answers. Has no patience for hand-waving — if your answer is incomplete, you'll hear about it.",
    traits: ["Direct", "Precise", "Technical", "Demanding"],
    badgeClass: "bg-blue-100 text-blue-700",
    accentClass: "text-blue-500",
  },
  jordan: {
    style: "Analytical",
    description:
      'Calm and methodical, with a deep curiosity about how you think. Asks things like "walk me through your reasoning" and "what would change if the requirements shifted?"',
    traits: ["Curious", "Methodical", "Patient", "Thoughtful"],
    badgeClass: "bg-green-100 text-green-700",
    accentClass: "text-green-500",
  },
};

export function InterviewerCard({
  interviewerId,
  isPreviewing,
  onPreviewVoice,
}: {
  interviewerId: string;
  isPreviewing: boolean;
  onPreviewVoice: () => void;
}) {
  const display = INTERVIEWER_DISPLAY[interviewerId] ?? INTERVIEWER_DISPLAY.cassidy!;

  return (
    <div className="overflow-hidden rounded-xl border border-white/50 bg-white/30">
      <div className="flex items-center justify-between gap-2 border-b border-white/40 px-4 py-2.5">
        <span className={`text-[10px] font-semibold tracking-wider uppercase ${display.accentClass}`}>
          {display.style}
        </span>
        <div className="flex gap-1">
          {display.traits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${display.badgeClass}`}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      <p className="px-4 py-3 text-sm leading-relaxed text-gray-600">{display.description}</p>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onPreviewVoice}
          disabled={isPreviewing}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
            isPreviewing
              ? "cursor-not-allowed border-white/40 bg-white/40 text-gray-400"
              : "border-white/50 bg-white/60 text-gray-700 shadow-sm hover:bg-white/80"
          }`}
        >
          {isPreviewing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Playing sample…
            </>
          ) : (
            <>
              <Volume2 className="size-4" />
              Preview voice
            </>
          )}
        </button>
      </div>
    </div>
  );
}
