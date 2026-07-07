/**
 * ConversationEntry — the rich, CLIENT-NEUTRAL record of the interaction AROUND
 * the interview, distinct from the machine's `InterviewEvent` log (which records
 * state changes only).
 *
 * The machine log answers "what changed"; this answers "what was said and why" —
 * utterances, narrated system context, tool calls/results, and the runtime signals
 * that flowed to clients, each timestamped. Folded into `InterviewResult.conversation`
 * it supports replay, AI/communication scoring, debugging, analytics, and coaching
 * with NO future runtime change (see docs/README.md).
 *
 * Extensible by construction: a new arm (e.g. a human interviewer's `annotation`)
 * is additive. Kept free of any client/voice types — `intent`/`tool` are plain
 * strings so the runtime never imports the voice layer (constraint C8).
 */

import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";

export type ConversationEntry =
  | { kind: "utterance"; role: "candidate" | "interviewer"; text: string; final: boolean; at: number }
  | { kind: "system"; text: string; at: number }
  | { kind: "tool-call"; tool: string; intent: string; args?: Record<string, unknown>; at: number }
  | { kind: "tool-result"; tool: string; ok: boolean; detail?: string; at: number }
  | { kind: "signal"; signal: RuntimeSignal; at: number };

/** Append immutably (mirrors the machine log's append-only discipline). */
export function appendConversation(
  log: readonly ConversationEntry[],
  entry: ConversationEntry,
): ConversationEntry[] {
  return [...log, entry];
}

// ── Constructors (small, so callers don't hand-roll `at`/`kind`) ──────────────

export function utterance(
  role: "candidate" | "interviewer",
  text: string,
  final = true,
  at: number = Date.now(),
): ConversationEntry {
  return { kind: "utterance", role, text, final, at };
}

export function systemNarration(text: string, at: number = Date.now()): ConversationEntry {
  return { kind: "system", text, at };
}

export function toolCall(
  tool: string,
  intent: string,
  args?: Record<string, unknown>,
  at: number = Date.now(),
): ConversationEntry {
  return args ? { kind: "tool-call", tool, intent, args, at } : { kind: "tool-call", tool, intent, at };
}

export function toolResult(
  tool: string,
  ok: boolean,
  detail?: string,
  at: number = Date.now(),
): ConversationEntry {
  return detail ? { kind: "tool-result", tool, ok, detail, at } : { kind: "tool-result", tool, ok, at };
}

export function signalEntry(signal: RuntimeSignal, at: number = Date.now()): ConversationEntry {
  return { kind: "signal", signal, at };
}
