import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StepsTimeline } from "@/components/marketing/steps-timeline";
import { howItWorksCta, howItWorksHero, howItWorksSteps } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From sign-up to scored and back again — the eight-step ACE.AI practice loop that turns nervous into ready.",
  alternates: { canonical: "/how-it-works" },
};

export default function MarketingHowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-bold tracking-widest text-purple-600 uppercase">
            {howItWorksHero.eyebrow}
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            {howItWorksHero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            {howItWorksHero.subtitle}
          </p>
        </div>
      </section>

      {/* Step timeline */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 py-20 md:px-8 md:py-24">
          <StepsTimeline steps={howItWorksSteps} />

          <div className="mt-16 text-center">
            <Link
              href={howItWorksCta.href}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              {howItWorksCta.label}
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
