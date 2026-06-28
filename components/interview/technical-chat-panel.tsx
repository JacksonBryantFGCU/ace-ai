import { MicVisualizer } from "@/components/interview/mic-visualizer";
import type { CallStatus } from "@/hooks/use-vapi-interview";
import type { TranscriptEntry } from "@/types/interview";

/** Bottom-left live transcript + interviewer status for the technical interview. */
export function TechnicalChatPanel({
  messages,
  status,
  isSpeaking,
  isListening,
  volumeLevel,
  interviewerName,
}: {
  messages: TranscriptEntry[];
  status: CallStatus;
  isSpeaking: boolean;
  isListening: boolean;
  volumeLevel: number;
  interviewerName: string;
}) {
  const statusLabel = isSpeaking
    ? "Interviewer is speaking…"
    : isListening
      ? "Listening to you…"
      : status === "connecting"
        ? "Connecting…"
        : "Ready";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`size-2.5 rounded-full ${status === "active" ? "animate-pulse bg-green-500" : "bg-gray-500"}`}
        />
        <span className="flex-1 text-sm font-medium text-gray-300" aria-live="polite">
          {statusLabel}
        </span>
        <MicVisualizer volumeLevel={volumeLevel} isListening={isListening} isSpeaking={isSpeaking} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">The interviewer will talk you through each problem.</p>
        ) : null}
        {messages.map((msg, i) => (
          <div key={`${msg.timestamp}-${i}`} className="flex gap-2 text-sm">
            <span
              className={`shrink-0 font-semibold ${msg.role === "assistant" ? "text-primary" : "text-cyan-400"}`}
            >
              {msg.role === "assistant" ? interviewerName : "You"}:
            </span>
            <p className="text-gray-300">{msg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
