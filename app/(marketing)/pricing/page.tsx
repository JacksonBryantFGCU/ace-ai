import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { SectionHeading } from "@/components/marketing/section-heading";
import { planComparison, pricingPlans } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with one full practice interview, or go Pro for unlimited practice.",
  alternates: { canonical: "/pricing" },
};

export default function MarketingPricingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-4 md:px-8">
        <SectionHeading
          title="Simple, honest pricing"
          subtitle="Try the whole experience free. Upgrade when you want unlimited practice."
        />
      </section>

      <section className="px-6 pb-8 md:px-8">
        <PricingTable plans={pricingPlans} />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <SectionHeading title="Compare in detail" />
        <div className="mt-12">
          <PlanComparison rows={planComparison} />
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Prices in USD. Cancel anytime — Pro stays active until the end of your billing period.
        </p>
      </section>
    </>
  );
}
