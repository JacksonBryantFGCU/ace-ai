import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { HeroDemoCard } from "@/components/home/hero-demo-card";
import type { HeroContent } from "@/lib/marketing/content";

/**
 * Landing hero. Server component; reuses the CSS-animated `HeroDemoCard`. Content
 * is passed in (props-driven) so copy lives in `lib/marketing/content`.
 */
export function Hero({ content }: { content: HeroContent }) {
  const { eyebrowBadge, eyebrowText, titleLine1, titleLine2, subtitle, primaryCta, secondaryCta, highlights } =
    content;

  return (
    <section className="mx-auto max-w-7xl px-6 pt-12 pb-8 md:px-8 lg:pt-20">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 py-1.5 pr-4 pl-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm">
            <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {eyebrowBadge}
            </span>
            {eyebrowText}
          </span>

          <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
            {titleLine1}
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              {titleLine2}
            </span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-gray-600 md:text-xl">{subtitle}</p>

          <div className="flex flex-wrap gap-4">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              {primaryCta.label}
              <ArrowRight className="size-5" />
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-8 py-4 font-semibold text-gray-900 shadow-sm backdrop-blur-md transition-all hover:shadow-md"
            >
              <Play className="size-4" />
              {secondaryCta.label}
            </Link>
          </div>

          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-green-600" />
                <span className="text-sm font-medium text-gray-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end lg:pt-2">
          <HeroDemoCard />
        </div>
      </div>
    </section>
  );
}
