import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhyContent } from "@/lib/marketing/content";

/** Subtly varied pastel gradients for the 2×2 stat cards (by position). */
const STAT_GRADIENTS = [
  "bg-gradient-to-br from-blue-50 to-purple-50",
  "bg-gradient-to-br from-purple-50 to-pink-50",
  "bg-gradient-to-br from-purple-50 to-pink-100/60",
  "bg-gradient-to-br from-pink-50 to-purple-50",
] as const;

/**
 * "Why ACE.AI" value section — left: heading + paragraph + checklist; right: a
 * 2×2 grid of stat cards. Server component, props-driven. Home-page filler (not
 * linked in the navbar). Left-aligned, so it doesn't use the centered
 * `SectionHeading`.
 */
export function WhySection({ content }: { content: WhyContent }) {
  const { eyebrow, title, paragraph, checklist, stats } = content;

  return (
    <section aria-labelledby="why-heading" className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: copy + checklist */}
        <div className="space-y-7">
          <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">{eyebrow}</p>
          <h2
            id="why-heading"
            className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            {title}
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-gray-600">{paragraph}</p>

          <ul className="space-y-4 pt-2">
            {checklist.map((item) => (
              <li key={item.lead} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-600">
                  <Check className="size-4" />
                </span>
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">{item.lead}</span> {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: stat cards */}
        <ul className="grid grid-cols-2 gap-5">
          {stats.map((stat, i) => (
            <li
              key={stat.label}
              className={cn(
                "rounded-3xl border border-white/70 p-7 shadow-sm",
                STAT_GRADIENTS[i % STAT_GRADIENTS.length],
              )}
            >
              <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-extrabold text-transparent">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
