import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/profile";
import { getAccess } from "@/server/billing";
import { canStartInterview } from "@/server/entitlements";
import { userDisplayName } from "@/lib/user-display";
import { formatDateTime } from "@/lib/format";
import { PASSES } from "@/lib/billing/passes";
import { RoleForm } from "@/components/profile/role-form";
import { BuyPassButton } from "@/components/billing/buy-pass-button";

export const metadata: Metadata = {
  title: "Profile & settings",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, access, entitlement] = await Promise.all([
    getProfile(user.id),
    getAccess(user.id),
    canStartInterview(user.id, user.email),
  ]);
  const name = userDisplayName(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile &amp; settings</h1>
        <p className="text-gray-600">Manage your account and interview preferences.</p>
      </div>

      {/* Account */}
      <section className="glass-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="text-gray-900">{name}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="break-all text-gray-900">{user.email ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Interview preferences */}
      <section className="glass-card space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Interview preferences</h2>
          <p className="text-sm text-gray-600">
            The role we preselect when you start a new interview. You can still change it per
            interview.
          </p>
        </div>
        <RoleForm initialRole={profile?.role ?? null} />
      </section>

      {/* Plan & billing */}
      <section className="glass-card space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Plan &amp; billing</h2>
          <p className="text-sm text-gray-600">Your current access and time passes.</p>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white/60 p-5">
          {entitlement.reason === "dev_override" ? (
            <>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                Testing access
              </span>
              <span className="text-sm text-gray-600">
                Unlimited interviews while billing is on hold.
              </span>
            </>
          ) : access.active ? (
            <>
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                Pass active
              </span>
              <span className="text-sm text-gray-600">
                Unlimited interviews until {formatDateTime(access.expiresAt!)}.
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                Free plan
              </span>
              <span className="text-sm text-gray-600">
                {entitlement.freeRemaining > 0
                  ? `${entitlement.freeRemaining} free interview${entitlement.freeRemaining === 1 ? "" : "s"} remaining.`
                  : "You've used your free interviews. Grab a pass for unlimited practice."}
              </span>
            </>
          )}
        </div>

        {/* Passes */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PASSES.map((pass) => (
            <div
              key={pass.id}
              className={`flex flex-col gap-3 rounded-2xl border p-5 ${
                pass.highlighted ? "border-purple-200 bg-purple-50/40" : "border-gray-100 bg-white/60"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{pass.label}</h3>
                <span className="text-lg font-bold text-gray-900">{pass.priceLabel}</span>
              </div>
              <p className="flex-1 text-sm text-gray-600">{pass.blurb}</p>
              <BuyPassButton
                passId={pass.id}
                isAuthed
                className={`rounded-xl px-5 py-2.5 text-center text-sm font-semibold transition-all ${
                  pass.highlighted
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg"
                    : "border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md"
                }`}
              >
                {access.active ? `Extend with ${pass.label}` : `Get ${pass.label}`}
              </BuyPassButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
