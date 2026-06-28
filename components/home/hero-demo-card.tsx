import { Clock } from "lucide-react";

/** Bar heights for the faux voice waveform (static; animated via CSS pulse). */
const WAVE_BARS = [8, 16, 24, 14, 30, 20, 10, 22, 32, 18, 9, 22, 28, 15, 11, 26, 19, 13, 30, 17, 8, 21, 14, 12];

/**
 * Decorative hero demo card — ported from the legacy `HeroPage` mock interview
 * (markup/classes preserved). Kept a Server Component; the only motion is CSS
 * (pulsing timer, avatar ring, blinking caret, waveform), per the CSS-first
 * animation decision (no Framer Motion).
 */
export function HeroDemoCard() {
  return (
    <div className="w-full max-w-xl">
      <div className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-lg backdrop-blur-xl md:p-7">
        {/* Title and timer */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="size-4" />
            <span className="font-semibold">Technical Interview</span>
          </div>
          <span className="animate-pulse rounded-xl bg-red-500 px-3 py-1.5 font-mono text-sm font-semibold text-white">
            1:58
          </span>
        </div>

        {/* Interviewer */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xl font-bold text-white">
              C
            </div>
            <span className="absolute inset-0 animate-ping rounded-full ring-2 ring-blue-400/60" />
            <span className="absolute -right-1 -bottom-1 size-4 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">Cassidy</div>
            <div className="text-sm text-gray-500">Senior Interviewer</div>
          </div>
        </div>

        {/* Chat */}
        <div className="mb-6 space-y-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 backdrop-blur-sm">
            <div className="mb-1.5 text-xs font-semibold text-blue-600">AI</div>
            <p className="text-sm leading-relaxed text-gray-800">
              Tell me about a time you had to debug a complex issue
            </p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4 backdrop-blur-sm">
            <div className="mb-1.5 text-xs font-semibold text-purple-600">YOU</div>
            <p className="text-sm leading-relaxed text-gray-800">
              I was working on a distributed system where…
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-purple-600 align-middle" />
            </p>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex h-14 items-center justify-center gap-1 rounded-2xl bg-gray-50/50" aria-hidden="true">
          {WAVE_BARS.map((h, i) => (
            <span
              key={i}
              className="w-1 animate-pulse rounded-full bg-gradient-to-t from-blue-400 to-purple-500"
              style={{ height: `${h}px`, animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
