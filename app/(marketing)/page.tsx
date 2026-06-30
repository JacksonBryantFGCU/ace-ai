import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { WhySection } from "@/components/marketing/why-section";
import { AnalyticsSection } from "@/components/marketing/analytics-section";
import { InterviewTypes } from "@/components/marketing/interview-types";
import { Testimonials } from "@/components/marketing/testimonials";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";
import { SectionHeading } from "@/components/marketing/section-heading";
import {
  features,
  finalCta,
  hero,
  analytics,
  interviewTypes,
  pricingPlans,
  roleLabels,
  steps,
  testimonials,
  why,
} from "@/lib/marketing/content";
import { faqItems } from "@/lib/marketing/faq";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/server/auth";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Per-section full-bleed background colors. Sections alternate between plain
 * white and a soft lavender-gray tint, with the hero gradient opening the page
 * and a dark band behind the analytics preview — matching the marketing design.
 */
const BG = {
  hero: "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100",
  white: "bg-white",
  tint: "bg-[#f5f4fa]",
  dark: "bg-[#0a0a14]",
} as const;

/**
 * Marketing landing page — composition only. Each section is its own Server
 * Component fed from the `lib/marketing` content modules; the wrappers here own
 * only the full-bleed section background.
 *
 * Architecture C: anonymous visitors see this landing page; authenticated users
 * are sent to their dashboard. Only the home route redirects — the other
 * marketing pages stay reachable while signed in.
 */
export default async function MarketingLandingPage() {
  if (await getUser()) {
    redirect("/dashboard");
  }

  return (
    <>
      <div className={BG.hero}>
        <Hero content={hero} />
      </div>

      <div className={BG.white}>
        <FeatureGrid
          features={features}
          eyebrow="Everything you need to get ready"
          title="A full mock-interview studio, not a question bank"
          subtitle="Real conversations, real code, and feedback that tells you exactly what to fix next."
          moreLink={{ label: "Explore all features", href: "/features" }}
        />
      </div>

      <div className={BG.tint}>
        <HowItWorks
          steps={steps}
          eyebrow="How it works"
          title="From sign-up to scored in minutes"
          moreLink={{ label: "See the full flow", href: "/how-it-works" }}
        />
      </div>

      <div className={BG.white}>
        <WhySection content={why} />
      </div>

      <div className={BG.dark}>
        <AnalyticsSection content={analytics} />
      </div>

      <div className={BG.tint}>
        <InterviewTypes
          types={interviewTypes}
          roleLabels={roleLabels}
          title="Two ways to practice"
          subtitle="Behavioral and technical rounds, tuned to the role you're targeting."
        />
      </div>

      <div className={BG.white}>
        <Testimonials items={testimonials} title="Built for serious prep" />
      </div>

      <div className={BG.tint}>
        <section aria-labelledby="pricing-heading" className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
          <div id="pricing-heading">
            <SectionHeading eyebrow="Simple pricing" title="Start free. Upgrade when you're serious." />
          </div>
          <div className="mt-14">
            <PricingTable plans={pricingPlans} />
          </div>
          <p className="mt-10 text-center text-sm">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 font-semibold text-purple-600 transition-colors hover:text-purple-700"
            >
              Compare plans in detail
              <ArrowRight className="size-4" />
            </Link>
          </p>
        </section>
      </div>

      <div className={BG.white}>
        <section aria-labelledby="faq-teaser-heading" className="mx-auto max-w-3xl px-6 py-16 md:px-8">
          <div id="faq-teaser-heading">
            <SectionHeading title="Frequently asked questions" />
          </div>
          <div className="mt-10">
            <Faq items={faqItems} limit={4} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/faq" className="font-medium text-blue-600 hover:underline">
              See all FAQs
            </Link>
          </p>
        </section>
      </div>

      <div className={BG.white}>
        <CtaSection title={finalCta.title} subtitle={finalCta.subtitle} cta={finalCta.cta} />
      </div>
    </>
  );
}
