import { Mic, MicOff, X } from "lucide-react";
import { formatClock } from "@/hooks/use-interview-timer";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SettingChip } from "@/components/interview/setting-chip";
import { Button } from "@/components/ui/button";

/** Top toolbar for the technical interview: config chips, progress, timer, controls. */
export function TechnicalToolbar({
  roleLabel,
  difficulty,
  level,
  languageLabel,
  questionNumber,
  totalQuestions,
  timeLeft,
  totalTime,
  isMuted,
  onToggleMute,
  onEnd,
}: {
  roleLabel: string;
  difficulty: string;
  level: string;
  languageLabel: string;
  questionNumber: number;
  totalQuestions: number;
  timeLeft: number;
  totalTime: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
}) {
  const progressPct = totalTime > 0 ? Math.min((1 - timeLeft / totalTime) * 100, 100) : 0;
  const timerColor =
    timeLeft <= 120 ? "text-red-400" : timeLeft <= 300 ? "text-amber-400" : "text-white";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SettingChip tone="purple">{roleLabel}</SettingChip>
          <SettingChip tone="amber">{titleCase(difficulty)}</SettingChip>
          <SettingChip tone="teal">{titleCase(level)}</SettingChip>
          <SettingChip tone="blue">{languageLabel}</SettingChip>
          <span className="text-sm text-gray-400">
            Problem {questionNumber} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn("font-mono text-xl tabular-nums", timerColor)}
            role="timer"
            aria-label="Time remaining"
          >
            {formatClock(timeLeft)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            className="rounded-full"
          >
            {isMuted ? <MicOff className="size-5 text-red-400" /> : <Mic className="size-5" />}
          </Button>
          <Button variant="destructive" onClick={onEnd} className="gap-2 rounded-full">
            <X className="size-4" /> End
          </Button>
        </div>
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Interview time elapsed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
