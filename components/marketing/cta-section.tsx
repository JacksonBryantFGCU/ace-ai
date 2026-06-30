import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CtaLink } from "@/lib/marketing/content";

/**
 * Closing call-to-action — a contained, rounded gradient card on a plain
 * background. Server component; copy + link passed as props.
 */
export function CtaSection({ title, subtitle, cta }: { title: string; subtitle?: string; cta: CtaLink }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 px-6 py-16 text-center shadow-lg md:px-12">
        <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h2>
        {subtitle ? <p className="max-w-xl text-lg text-white/90">{subtitle}</p> : null}
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-purple-700 shadow-md transition-all hover:shadow-lg"
        >
          {cta.label}
          <ArrowRight className="size-5" />
        </Link>
      </div>
    </section>
  );
}
