import { cn } from "@/lib/utils";

/** Color-coded outline pills for the interview config summary (legacy dark UI). */
const TONES = {
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  blue: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  teal: "border-teal-500/40 bg-teal-500/10 text-teal-300",
  red: "border-red-500/40 bg-red-500/10 text-red-300",
} as const;

export type ChipTone = keyof typeof TONES;

export function SettingChip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", TONES[tone])}>
      {children}
    </span>
  );
}
