"use client";

import { Loader2, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { shell } from "@/components/scenario/shell/tokens";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewController } from "@/lib/scenarios/interview-controller";

/**
 * The live interviewer presence card in the top bar. Owns the (optional) voice
 * session — the SAME controller the on-screen buttons drive — and reflects its
 * state: connecting, speaking, listening, muted, or ended. Replaces the old
 * `VoiceDock`; voice is still strictly additive (nothing here mutates the
 * interview until the call goes active).
 */
export function InterviewerPresence({
  controller,
  onConversation,
  interviewerName,
  personaId,
  autoStart = false,
}: {
  controller: InterviewController;
  onConversation?: (entry: ConversationEntry) => void;
  interviewerName: string;
  personaId?: string;
  autoStart?: boolean;
}) {
  const voice = useVoiceSession({ controller, onConversation, personaId, autoStart });
  const initials = interviewerName.slice(0, 2).toUpperCase();
  const active = voice.status === "active";
  const connecting = voice.status === "connecting";
  const speaking = active && voice.speaking && !voice.muted;

  const statusText = connecting
    ? "Connecting…"
    : active
      ? voice.muted
        ? "Muted"
        : voice.speaking
          ? "Speaking"
          : "Listening"
      : voice.status === "ended"
        ? "Call ended"
        : "Voice ready";

  return (
    <div
      className="flex flex-none items-center gap-3 rounded-xl py-1.5 pr-2 pl-3"
      style={{ background: shell.presenceBg, border: `1px solid ${shell.presenceBorder}` }}
    >
      <div className="relative size-[30px] flex-none">
        {speaking ? (
          <span
            className="voice-ring absolute inset-0 rounded-full"
            style={{ border: `2px solid ${shell.presenceRing}` }}
            aria-hidden="true"
          />
        ) : null}
        <div
          className="flex size-[30px] items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: shell.presenceAvatar }}
        >
          {initials}
        </div>
      </div>

      <div className="leading-tight whitespace-nowrap">
        <div className="text-[12.5px] font-semibold text-white">{interviewerName}</div>
        <div className="text-[11px]" style={{ color: shell.presenceSpeaking }} aria-live="polite">
          {statusText}
        </div>
      </div>

      {/* Waveform — animates only while the interviewer is actually speaking. */}
      <span className="inline-flex h-4 items-end gap-[2px]" aria-hidden="true">
        {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
          <span
            key={i}
            className={speaking ? "voice-wave-bar" : undefined}
            style={{
              width: 2.5,
              height: 16,
              borderRadius: 2,
              background: shell.presenceWave,
              transform: speaking ? undefined : "scaleY(0.28)",
              transformOrigin: "bottom",
              animationDelay: `-${delay}s`,
              opacity: active ? 1 : 0.4,
            }}
          />
        ))}
      </span>

      <div className="ml-0.5 flex gap-1.5">
        {active || connecting ? (
          <>
            <button
              type="button"
              onClick={voice.toggleMute}
              aria-pressed={voice.muted}
              aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"}
              className="flex size-7 items-center justify-center rounded-lg border border-white/15 text-gray-200 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              {voice.muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={voice.stop}
              aria-label="End voice call"
              className="flex size-7 items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 transition-colors hover:bg-red-400/20 focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:outline-none"
            >
              <PhoneOff className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void voice.start()}
            aria-label={voice.status === "ended" ? "Restart voice call" : "Start voice call"}
            className="flex size-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 transition-colors hover:bg-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none"
          >
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
          </button>
        )}
      </div>

      {voice.error ? <span className="sr-only" role="alert">{voice.error}</span> : null}
    </div>
  );
}
