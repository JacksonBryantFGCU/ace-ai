import type { Metadata } from "next";
import Link from "next/link";
import { Check, History } from "lucide-react";
import { HeroDemoCard } from "@/components/home/hero-demo-card";

export const metadata: Metadata = {
  title: "Home",
};

const HIGHLIGHTS = [
  "Used by students preparing for FAANG interviews",
  "5-minute mock interviews with instant feedback",
  "No signup required",
];

/**
 * Home — the authenticated entry point, recreated from the legacy `HeroPage`
 * (markup/classes ported). Renders inside the app shell (dashboard navbar + hero
 * gradient). "Start Interview" begins the Practice flow at role selection.
 */
export default function HomePage() {
  return (
    <section className="px-0 pt-0 pb-6">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
              Practice{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Real
              </span>
              <br />
              Interviews.
            </h1>
            <h2 className="text-5xl leading-[0.95] font-extrabold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
              Not Just Questions.
            </h2>
          </div>

          <p className="max-w-xl text-lg leading-relaxed text-gray-600 md:text-xl">
            AI voice interviewers that challenge you with real follow-ups, realistic pressure, and
            personalized feedback — so you&apos;re actually ready.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/roles"
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              Start Interview
            </Link>
            <Link
              href="/roles"
              className="rounded-2xl border border-white/60 bg-white/50 px-8 py-4 font-semibold text-gray-900 shadow-sm backdrop-blur-md transition-all hover:shadow-md"
            >
              Watch Demo
            </Link>
          </div>

          <Link
            href="/interviews"
            className="flex w-fit items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
          >
            <History className="size-4" />
            View past interviews
          </Link>

          <div className="space-y-3 pt-2">
            {HIGHLIGHTS.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="size-5 shrink-0 text-green-600" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex justify-center lg:justify-end lg:pt-2">
          <HeroDemoCard />
        </div>
      </div>
    </section>
  );
}
