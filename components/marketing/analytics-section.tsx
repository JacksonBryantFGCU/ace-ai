import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsContent } from "@/lib/marketing/content";

/**
 * "See yourself improve" analytics section — left: eyebrow + heading + paragraph
 * + CTA; right: a dark mock "readiness score" dashboard card with a trend chart
 * and a 2×2 grid of competency grades. Server component, props-driven. The whole
 * section runs dark to make the dashboard preview pop against the light page.
 */
export function AnalyticsSection({ content }: { content: AnalyticsContent }) {
  const { eyebrow, title, paragraph, cta, readiness } = content;

  return (
    <section
      aria-labelledby="analytics-heading"
      className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: copy + CTA */}
        <div className="space-y-7">
          <p className="text-sm font-bold tracking-widest text-blue-400 uppercase">{eyebrow}</p>
          <h2
            id="analytics-heading"
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {title}
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-gray-400">{paragraph}</p>

          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-white shadow-sm transition-all hover:bg-white/10"
          >
            {cta.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Right: mock readiness dashboard card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-xl md:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">{readiness.label}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400">
              <TrendingUp className="size-3.5" />
              {readiness.trend}
            </span>
          </div>

          <p className="mt-4 text-6xl font-extrabold tracking-tight text-white">
            {readiness.score}
            <span className="text-3xl font-bold text-gray-500">/{readiness.outOf}</span>
          </p>

          {/* Trend chart — last two bars use the brand gradient to mark recent gains */}
          <div className="mt-7 flex h-32 items-end gap-3" aria-hidden>
            {readiness.bars.map((h, i) => {
              const recent = i >= readiness.bars.length - 2;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-xl",
                    recent ? "bg-gradient-to-t from-pink-500 via-purple-500 to-blue-500" : "bg-white/[0.07]",
                  )}
                  style={{ height: `${h * 100}%` }}
                />
              );
            })}
          </div>

          {/* Competency scores (0–100, mirroring the in-app scoring) */}
          <ul className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {readiness.competencies.map((c) => (
              <li key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <p className="text-xs text-gray-400 sm:text-sm">{c.label}</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-extrabold",
                    c.tone === "warn" ? "text-amber-400" : "text-white",
                  )}
                >
                  {c.score}
                  <span className="text-sm font-bold text-gray-500">/100</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
