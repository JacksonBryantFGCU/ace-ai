import Link from "next/link";
import { ArrowRight, Mic, Sparkles } from "lucide-react";

/**
 * First-run onboarding for the dashboard. Shown in place of the analytics
 * overview while the user has completed zero interviews; it welcomes them and
 * points a single, prominent primary action at the New Interview flow (`/new`).
 * Once an interview exists the dashboard renders the normal analytics instead.
 */
export function OnboardingCard() {
  return (
    <section
      aria-labelledby="onboarding-heading"
      className="glass-card relative overflow-hidden p-8 text-center md:p-12"
    >
      {/* Soft decorative gradient wash behind the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-300/40 to-purple-300/40 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
          <Sparkles className="size-7" />
        </span>

        <div className="space-y-2">
          <h2 id="onboarding-heading" className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Welcome to ACE.AI
          </h2>
          <p className="text-gray-600 md:text-lg">
            You haven&apos;t taken an interview yet. Run your first AI mock interview to get instant,
            structured feedback — and start tracking your progress here.
          </p>
        </div>

        <Link
          href="/new"
          className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
        >
          <Mic className="size-5" />
          Start Your First Interview
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="text-sm text-gray-500">Behavioral or technical · about 25 minutes · no signup pressure</p>
      </div>
    </section>
  );
}
