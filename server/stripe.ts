import "server-only";

import Stripe from "stripe";
import { getStripeSecretKey } from "@/config/env.server";

/** Lazy Stripe client singleton. The secret key is read only when first used, so
 *  `next build` doesn't require Stripe env to be present. */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) client = new Stripe(getStripeSecretKey());
  return client;
}
