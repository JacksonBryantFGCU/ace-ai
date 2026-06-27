"use client";

/**
 * Volume-reactive mic indicator. Ported from the legacy `MicVisualizer`; the
 * framer-motion ring animation is rendered with CSS transitions instead (no new
 * animation dependency). Behavior preserved: rings scale with `volumeLevel` while
 * listening, pulse while the AI speaks, idle otherwise.
 */
export function MicVisualizer({
  volumeLevel,
  isListening,
  isSpeaking,
}: {
  volumeLevel: number;
  isListening: boolean;
  isSpeaking: boolean;
}) {
  const isActive = isListening || isSpeaking;

  // rgb prefix per state (purple speaking / green listening / gray idle).
  const ringColor = isSpeaking
    ? "rgba(168, 85, 247,"
    : isListening
      ? "rgba(34, 197, 94,"
      : "rgba(75, 85, 99,";

  const rings = [0.55, 0.72, 0.9];

  const label = isSpeaking ? "AI Speaking…" : isListening ? "Listening…" : "Idle";
  const labelColor = isSpeaking
    ? "text-purple-500 dark:text-purple-400"
    : isListening
      ? "text-green-600 dark:text-green-400"
      : "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex h-12 w-12 items-center justify-center">
        {rings.map((baseScale, i) => {
          const volumeBoost = isListening ? volumeLevel * 0.4 : 0;
          const scale = baseScale + volumeBoost;
          const opacity = isActive
            ? 0.15 + (1 - baseScale) * 0.6 + (isListening ? volumeLevel * 0.4 : 0)
            : 0.12;

          return (
            <span
              key={i}
              className={`absolute rounded-full border transition-transform duration-150 ease-out ${
                isSpeaking ? "animate-pulse" : ""
              }`}
              style={{
                width: 48,
                height: 48,
                transform: `scale(${scale})`,
                borderColor: `${ringColor}${Math.min(opacity, 0.9)})`,
                backgroundColor: `${ringColor}${Math.min(opacity * 0.3, 0.25)})`,
              }}
            />
          );
        })}
        <span
          className="z-10 h-3 w-3 rounded-full transition-colors duration-300"
          style={{ backgroundColor: `${ringColor}0.9)` }}
        />
      </div>
      <span className={`text-[9px] font-medium tracking-wide transition-colors ${labelColor}`}>
        {label}
      </span>
    </div>
  );
}
