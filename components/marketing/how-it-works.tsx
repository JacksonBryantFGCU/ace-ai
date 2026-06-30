import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import type { CtaLink, Step } from "@/lib/marketing/content";

/**
 * "How it works" steps. Server component; takes the step list as a prop. Each
 * card leads with a numbered gradient badge (the list index). `moreLink` renders
 * the "see the full flow" link to the in-depth page.
 */
export function HowItWorks({
  steps,
  eyebrow,
  title,
  subtitle,
  moreLink,
}: {
  steps: Step[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  moreLink?: CtaLink;
}) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24"
    >
      <div id="how-it-works-heading">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      </div>

      <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
            </div>
            <p className="leading-relaxed text-gray-500">{step.description}</p>
          </li>
        ))}
      </ol>

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
