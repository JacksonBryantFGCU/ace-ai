import { cn } from "@/lib/utils";
import type { FeatureSpotlight as FeatureSpotlightContent, SpotlightVisual, Tone } from "@/lib/marketing/content";

/** Pastel icon-tile classes per accent tone (tile background + icon color). */
const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-pink-100 text-pink-600",
};

/**
 * A headline feature row: copy on one side, an illustrative mock on the other.
 * Server component, props-driven. `reverse` flips the visual to the left on
 * large screens (visual always renders after copy in the DOM for reading order).
 */
export function FeatureSpotlight({ feature }: { feature: FeatureSpotlightContent }) {
  const { icon: Icon, tone, title, description, visual, reverse } = feature;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn("space-y-5", reverse && "lg:order-2")}>
        <span
          className={cn("flex size-12 items-center justify-center rounded-2xl", TONE_CLASSES[tone])}
        >
          <Icon className="size-6" />
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
        <p className="max-w-xl text-lg leading-relaxed text-gray-600">{description}</p>
      </div>

      <div className={cn(reverse && "lg:order-1")}>
        <SpotlightMock visual={visual} />
      </div>
    </div>
  );
}

/** Picks the bespoke mock for a spotlight. */
function SpotlightMock({ visual }: { visual: SpotlightVisual }) {
  if (visual === "chat") return <ChatMock />;
  if (visual === "code") return <CodeMock />;
  return <VoiceMock />;
}

/** Behavioral — a short transcript exchange. */
function ChatMock() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm" aria-hidden>
      <div className="space-y-3">
        <p className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-gray-700">
          <span className="font-bold text-blue-600">AI</span> · Tell me about a project that didn&apos;t go
          to plan.
        </p>
        <p className="rounded-2xl border border-pink-100 bg-pink-50/70 px-4 py-3 text-sm text-gray-700">
          <span className="font-bold text-pink-600">You</span> · We shipped late because requirements kept
          shifting…
        </p>
        <p className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-gray-700">
          <span className="font-bold text-blue-600">AI</span> · Interesting — what specifically did you
          change after that?
        </p>
      </div>
    </div>
  );
}

/** Technical — a snippet in a dark editor card. */
function CodeMock() {
  return (
    <div className="rounded-3xl bg-[#0a0a14] p-6 shadow-sm" aria-hidden>
      <pre className="overflow-x-auto font-mono text-sm leading-relaxed">
        <code>
          <span className="text-gray-500">{"// design a rate limiter"}</span>
          {"\n"}
          <span className="text-purple-400">function</span>{" "}
          <span className="text-blue-400">allow</span>
          <span className="text-gray-300">(key) {"{"}</span>
          {"\n  "}
          <span className="text-purple-400">const</span>{" "}
          <span className="text-gray-300">now = Date.now();</span>
          {"\n  "}
          <span className="text-gray-300">window.push(now);</span>
          {"\n  "}
          <span className="text-purple-400">return</span>{" "}
          <span className="text-gray-300">window.length ≤ </span>
          <span className="text-amber-400">limit</span>
          <span className="text-gray-300">;</span>
          {"\n"}
          <span className="text-gray-300">{"}"}</span>
        </code>
      </pre>
    </div>
  );
}

/** Voice — a static gradient waveform. */
function VoiceMock() {
  // Symmetric-ish bar heights (%), evoking a voice waveform.
  const bars = [30, 55, 80, 45, 95, 60, 100, 70, 40, 65, 35];
  return (
    <div
      className="flex h-44 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm"
      aria-hidden
    >
      <div className="flex h-20 items-center gap-1.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-2 rounded-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
