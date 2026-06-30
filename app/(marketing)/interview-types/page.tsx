import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  interviewTracks,
  interviewTracksHero,
  interviewTracksRequest,
} from "@/lib/marketing/content";
import type { Tone } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Interview types",
  description:
    "Eight role tracks — frontend, backend, full-stack, ML, mobile, DevOps, security, and systems — each tailored to the role you're targeting.",
  alternates: { canonical: "/interview-types" },
};

/** Pastel icon-tile classes per accent tone (tile background + icon color). */
const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-pink-100 text-pink-600",
};

export default function MarketingInterviewTypesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-bold tracking-widest text-purple-600 uppercase">
            {interviewTracksHero.eyebrow}
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            {interviewTracksHero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            {interviewTracksHero.subtitle}
          </p>
        </div>
      </section>

      {/* Role tracks */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {interviewTracks.map((track) => {
              const Icon = track.icon;
              return (
                <li
                  key={track.title}
                  className="flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                        TONE_CLASSES[track.tone],
                      )}
                    >
                      <Icon className="size-6" />
                    </span>
                    <h2 className="text-xl font-bold text-gray-900">{track.title}</h2>
                  </div>
                  <p className="leading-relaxed text-gray-600">{track.description}</p>
                  <ul className="mt-auto flex flex-wrap gap-2">
                    {track.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>

          {/* Request-a-track panel */}
          <div className="mt-12 rounded-3xl bg-[#f5f4fa] px-6 py-12 text-center md:px-12">
            <h2 className="text-2xl font-bold text-gray-900">{interviewTracksRequest.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">{interviewTracksRequest.subtitle}</p>
            <Link
              href={interviewTracksRequest.cta.href}
              className="mt-5 inline-flex items-center gap-1.5 font-semibold text-purple-600 transition-colors hover:text-purple-700"
            >
              {interviewTracksRequest.cta.label}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
