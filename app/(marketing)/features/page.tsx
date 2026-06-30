import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatureSpotlight } from "@/components/marketing/feature-spotlight";
import { featureCards, featuresHero, featureSpotlights } from "@/lib/marketing/content";
import type { Tone } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Features",
  description:
    "A full mock-interview studio: voice AI interviewer, behavioral and technical rounds, live coding, replay, analytics, and progress tracking.",
  alternates: { canonical: "/features" },
};

/** Pastel icon-tile classes per accent tone (tile background + icon color). */
const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-pink-100 text-pink-600",
};

export default function MarketingFeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-bold tracking-widest text-purple-600 uppercase">
            {featuresHero.eyebrow}
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            {featuresHero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            {featuresHero.subtitle}
          </p>
          <div className="mt-10">
            <Link
              href={featuresHero.cta.href}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              {featuresHero.cta.label}
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Spotlights */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-20 md:px-8 md:py-28 md:gap-28">
          {featureSpotlights.map((feature) => (
            <FeatureSpotlight key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      {/* Supporting feature cards */}
      <section className="bg-[#f5f4fa]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <li
                  key={feature.title}
                  className="flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl",
                      TONE_CLASSES[feature.tone],
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                    <p className="leading-relaxed text-gray-500">{feature.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
