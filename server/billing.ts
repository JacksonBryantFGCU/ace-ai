import "server-only";

import type { User } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/server/db/admin";
import { getStripe } from "@/server/stripe";
import { getProfile } from "@/server/profile";
import { computeAccessExpiry, type Pass } from "@/lib/billing/passes";

/** Current pass access for a user, derived from `access_expires_at`. */
export interface Access {
  active: boolean;
  expiresAt: string | null;
}

export async function getAccess(userId: string): Promise<Access> {
  const profile = await getProfile(userId);
  const expiresAt = profile?.access_expires_at ?? null;
  const active = expiresAt ? new Date(expiresAt).getTime() > Date.now() : false;
  return { active, expiresAt };
}

/**
 * Find-or-create the user's Stripe customer, persisting `stripe_customer_id` on
 * the profile via the admin client. Returns the customer id.
 */
export async function findOrCreateCustomer(user: User): Promise<string> {
  const profile = await getProfile(user.id);
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: user.email ?? undefined,
    metadata: { userId: user.id },
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);
  if (error) {
    console.error("findOrCreateCustomer: failed to persist customer id:", error.message);
    throw new Error("Failed to set up billing");
  }

  revalidateTag(`profile:${user.id}`, "max");
  return customer.id;
}

/**
 * Apply a purchased pass to a user (called from the webhook with the service-role
 * client). Extends `access_expires_at` so passes stack, and busts the profile
 * cache. Matched by Stripe customer id.
 */
export async function applyPassByCustomer(stripeCustomerId: string, pass: Pass): Promise<void> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id, access_expires_at")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error || !data) {
    console.error("applyPassByCustomer: profile not found for customer", stripeCustomerId);
    throw new Error("Profile not found for Stripe customer");
  }

  const row = data as { id: string; access_expires_at: string | null };
  const expiry = computeAccessExpiry(pass, row.access_expires_at);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ access_expires_at: expiry })
    .eq("id", row.id);
  if (updateError) {
    console.error("applyPassByCustomer: failed to extend access:", updateError.message);
    throw new Error("Failed to apply pass");
  }

  revalidateTag(`profile:${row.id}`, "max");
}
