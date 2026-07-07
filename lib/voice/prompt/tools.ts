/**
 * The tool surface the interviewer assistant is given — the SAME for every scenario
 * (data-driven, constraint C7). Each tool maps to a state-changing VoiceIntent; the
 * assistant is instructed to call the tool and wait for the runtime to confirm,
 * never to assert a change itself.
 *
 * `REQUEST_REPEAT` and `REQUEST_CLARIFICATION` are intentionally NOT tools — they're
 * conversational (the adapter re-narrates / the assistant answers from context), so
 * they never need to round-trip through the runtime.
 */

import type { VoiceIntentType } from "@/lib/voice/intents";
import type { VoiceToolDefinition } from "@/lib/voice/provider";

const TOOLS: readonly VoiceToolDefinition[] = [
  {
    name: "request_hint",
    intent: "REQUEST_HINT",
    description:
      "Reveal the next progressive hint to the candidate. Call this when they ask for a hint or are clearly stuck. Wait for the system to return the hint text before reading it.",
  },
  {
    name: "run_verification",
    intent: "REQUEST_VERIFICATION",
    description:
      "Run the candidate's tests for the current step. Call this when they say they're ready to check their work. Wait for the system to report pass or fail.",
  },
  {
    name: "next_step",
    intent: "NEXT_STEP",
    description:
      "Advance to the next step. Call this only once the candidate is done with the current step. On the last step this finishes the interview.",
  },
  {
    name: "previous_step",
    intent: "PREVIOUS_STEP",
    description: "Go back to the previous step if the candidate asks to revisit it.",
  },
  {
    name: "offer_checkpoint",
    intent: "REQUEST_CHECKPOINT",
    description:
      "Offer the candidate a checkpoint that restores known-good code for this step. Call this only if they are badly stuck; using it means the step is not self-earned.",
  },
  {
    name: "finish_interview",
    intent: "FINISH_INTERVIEW",
    description: "End the interview and move to the summary. Call this when all steps are complete.",
  },
];

/** The tool definitions handed to a provider when starting a call. */
export function buildVoiceTools(): VoiceToolDefinition[] {
  return TOOLS.map((tool) => ({ ...tool }));
}

/** Reverse lookup: the tool name backing a given intent (null for conversational intents). */
const TOOL_BY_INTENT: Partial<Record<VoiceIntentType, string>> = Object.fromEntries(
  TOOLS.map((tool) => [tool.intent, tool.name]),
);

export function toolNameForIntent(intent: VoiceIntentType): string | null {
  return TOOL_BY_INTENT[intent] ?? null;
}
