import Link from "next/link";
import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/marketing/content";
import { BuyPassButton } from "@/components/billing/buy-pass-button";

/**
 * Pricing plans. Server component; plans are passed in as props. Pass plans buy a
 * time pass (auth-aware) via `BuyPassButton`; the Free plan keeps a plain link.
 * `isAuthed` decides whether a pass CTA starts checkout or routes to sign-up.
 */
export function PricingTable({ plans, isAuthed = false }: { plans: PricingPlan[]; isAuthed?: boolean }) {
  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`relative flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-sm ${
            plan.highlighted
              ? "ring-2 ring-purple-500"
              : "border border-gray-100"
          }`}
        >
          {plan.highlighted ? (
            <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-xs font-bold tracking-wide text-white uppercase shadow-sm">
              Most popular
            </span>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-gray-900">{plan.price}</span>
              {plan.period ? <span className="text-gray-500">{plan.period}</span> : null}
            </p>
            <p className="text-sm text-gray-600">{plan.description}</p>
          </div>

          <ul className="flex-1 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                <Check
                  className={`mt-0.5 size-4 shrink-0 ${plan.highlighted ? "text-purple-600" : "text-green-600"}`}
                />
                {feature}
              </li>
            ))}
          </ul>

          {plan.passId ? (
            <BuyPassButton
              passId={plan.passId}
              isAuthed={isAuthed}
              className={`block rounded-xl px-6 py-3.5 text-center text-sm font-semibold transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md hover:shadow-lg"
                  : "border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md"
              }`}
            >
              {plan.cta.label}
            </BuyPassButton>
          ) : (
            <Link
              href={plan.cta.href}
              className={`rounded-xl px-6 py-3.5 text-center text-sm font-semibold transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-md hover:shadow-lg"
                  : "border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md"
              }`}
            >
              {plan.cta.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
