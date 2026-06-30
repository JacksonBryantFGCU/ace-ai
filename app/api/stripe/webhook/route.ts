import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/stripe";
import { getStripeWebhookSecret } from "@/config/env.server";
import { applyPassByCustomer } from "@/server/billing";
import { asPassId, getPass } from "@/lib/billing/passes";

// Stripe signature verification uses Node crypto and the raw body — pin to the
// Node.js runtime (not Edge).
export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook — grants pass access after a successful payment.
 *
 * Must read the **raw** request body for signature verification (no JSON parsing
 * before `constructEvent`). Writes subscription/access state via the service-role
 * admin client inside `applyPassByCustomer`. Only `checkout.session.completed` is
 * handled — time passes are one-time payments, so there is no subscription
 * lifecycle to track.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const passId = asPassId(session.metadata?.passId);

    if (!customerId || !passId) {
      console.error("checkout.session.completed missing customer or passId", {
        customerId,
        metadata: session.metadata,
      });
      // 200 so Stripe doesn't retry a payload we can't act on.
      return NextResponse.json({ received: true });
    }

    try {
      await applyPassByCustomer(customerId, getPass(passId));
    } catch (error) {
      console.error("Failed to apply pass from webhook:", error);
      // 500 → Stripe retries, so a paid user reliably gets access even through a
      // transient DB failure. A retry after a successful grant would extend twice
      // (customer-favorable and rare), which we accept over failing to grant.
      return NextResponse.json({ error: "Failed to apply pass" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
