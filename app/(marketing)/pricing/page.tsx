import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { SectionHeading } from "@/components/marketing/section-heading";
import { planComparison, pricingPlans } from "@/lib/marketing/content";
import { getUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with two full practice interviews, then grab a day or week pass for unlimited practice.",
  alternates: { canonical: "/pricing" },
};

export default async function MarketingPricingPage() {
  const isAuthed = Boolean(await getUser());

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-4 md:px-8">
        <SectionHeading
          title="Simple, honest pricing"
          subtitle="Start free. When an interview is coming up, grab a pass for unlimited practice — no subscription."
        />
      </section>

      <section className="px-6 pb-8 md:px-8">
        <PricingTable plans={pricingPlans} isAuthed={isAuthed} />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <SectionHeading title="Compare in detail" />
        <div className="mt-12">
          <PlanComparison rows={planComparison} />
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Prices in USD. Passes are one-time payments — no subscription, nothing to cancel.
        </p>
      </section>
    </>
  );
}
