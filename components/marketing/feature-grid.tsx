import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";
import type { CtaLink, Feature, Tone } from "@/lib/marketing/content";

/** Pastel icon-tile classes per accent tone (tile background + icon color). */
const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-pink-100 text-pink-600",
};

/** Feature grid. Server component; takes the feature list as a prop. */
export function FeatureGrid({
  features,
  eyebrow,
  title,
  subtitle,
  moreLink,
}: {
  features: Feature[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  moreLink?: CtaLink;
}) {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24"
    >
      <div id="features-heading">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      </div>

      <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
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

      {moreLink ? (
        <div className="mt-10 text-center">
          <Link
            href={moreLink.href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 transition-colors hover:text-purple-700"
          >
            {moreLink.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
