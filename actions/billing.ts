"use server";

import { requireUser } from "@/server/auth";
import { getStripe } from "@/server/stripe";
import { findOrCreateCustomer } from "@/server/billing";
import { getStripePriceId } from "@/config/env.server";
import { publicEnv } from "@/config/env.public";
import { asPassId } from "@/lib/billing/passes";

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Create a one-time Stripe Checkout Session for a time pass and return its URL.
 * Passes are one-off payments (`mode: "payment"`) — no subscription lifecycle.
 * The webhook grants access on `checkout.session.completed`, keyed by customer.
 */
export async function createCheckoutSession(passIdInput: string): Promise<CheckoutResult> {
  const user = await requireUser();

  const passId = asPassId(passIdInput);
  if (!passId) return { ok: false, error: "Unknown pass." };

  try {
    const customerId = await findOrCreateCustomer(user);

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: getStripePriceId(passId), quantity: 1 }],
      // Defence in depth: the webhook trusts the customer match, but we also tag
      // the session so it's traceable to the user and pass.
      metadata: { userId: user.id, passId },
      success_url: `${publicEnv.siteUrl}/dashboard?purchase=success`,
      cancel_url: `${publicEnv.siteUrl}/pricing`,
    });

    if (!session.url) return { ok: false, error: "Could not start checkout." };
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("createCheckoutSession failed:", error);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}
