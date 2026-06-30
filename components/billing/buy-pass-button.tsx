"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createCheckoutSession } from "@/actions/billing";
import type { PassId } from "@/lib/billing/passes";

/**
 * Auth-aware buy button for a time pass. Anonymous visitors are sent to sign up
 * (returning to pricing afterwards); authenticated users start a Stripe Checkout
 * Session and are redirected to it. Used on the marketing pricing page and the
 * profile billing card.
 */
export function BuyPassButton({
  passId,
  isAuthed,
  className,
  children,
}: {
  passId: PassId;
  isAuthed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isAuthed) {
    return (
      <Link href="/signup?next=/pricing" className={className}>
        {children}
      </Link>
    );
  }

  function buy() {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutSession(passId);
      if (res.ok) {
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={buy} disabled={pending} className={className}>
        {pending ? "Redirecting…" : children}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-center text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
