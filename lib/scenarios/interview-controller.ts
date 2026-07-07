/**
 * InterviewController — the single, CLIENT-AGNOSTIC facade over the interview
 * runtime (session + machine + verification + evaluation coordination).
 *
 * It is the one choke point into the runtime: every client — the on-screen
 * buttons, the voice layer, a future replay narrator, an interviewer dashboard —
 * drives the interview through THESE methods and observes it through the
 * `RuntimeSignal` stream. There is no other write path, so the machine stays the
 * single source of truth.
 *
 * This interface references NO voice/Vapi types (constraint C8). Deleting the
 * entire `lib/voice/**` tree must leave this file — and the runtime and button UI —
 * compiling unchanged. Voice depends on the controller; the controller never
 * depends on voice.
 *
 * The concrete implementation is a React hook (`hooks/use-interview-controller.ts`,
 * Phase 3) that wraps the composed runtime hooks. Only the CONTRACT lives here so
 * pure clients (the voice adapter, tests) can be written against it without React.
 */

import type { InterviewPhase } from "@/lib/scenarios/interview-machine";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";
import type { StepKind } from "@/lib/scenarios/schema";
import type { VerificationResult } from "@/lib/scenarios/verification";

/** Read-only snapshot used to build prompts / drive client UI (plain data). */
export interface InterviewContext {
  scenario: { id: string; title: string; summary: string; difficulty: string };
  step: {
    index: number;
    total: number;
    id: string;
    kind: StepKind;
    prompt: string;
    hintsAvailable: number;
    hintsRevealed: number;
    verification: string;
    checkpointAvailable: boolean;
  } | null;
  latestVerification: VerificationResult | null;
  phase: InterviewPhase;
}

export interface InterviewController {
  // ── inbound: the only way to affect the interview (all clients share these) ──
  revealHint(): void;
  setResponse(text: string): void;
  /** Run the REAL verification service for the current step (not a status flip). */
  runVerification(): Promise<void>;
  offerCheckpoint(): void;
  confirmCheckpoint(): Promise<void>;
  declineCheckpoint(): void;
  next(): void;
  prev(): void;
  goTo(index: number): void;
  complete(): void;

  // ── outbound: runtime → clients (pure derivation of the append-only log) ─────
  /** Subscribe to the signal stream; returns an unsubscribe fn. */
  subscribe(listener: (signal: RuntimeSignal) => void): () => void;

  // ── read-only snapshot for prompt building / client UI ───────────────────────
  getContext(): InterviewContext;
}

/**
 * InterviewClient — anything that drives/observes an interview through the
 * controller. Voice ships one; buttons are a React client; replay and a human
 * dashboard are future clients. The controller special-cases none of them.
 */
export interface InterviewClient {
  /** Stable id, e.g. "voice" | "buttons" | "replay". */
  readonly id: string;
  /** Wire inputs + subscribe to signals. */
  attach(controller: InterviewController): void;
  /** Unsubscribe and release any resources (mic, sockets, timers). */
  detach(): void;
}
