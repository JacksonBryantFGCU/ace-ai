import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/marketing/faq";
import { faqItems } from "@/lib/marketing/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ACE.AI voice interview practice.",
  alternates: { canonical: "/faq" },
};

export default function MarketingFaqPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center md:px-8 md:py-28">
          <p className="text-sm font-bold tracking-widest text-purple-600 uppercase">FAQ</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl lg:whitespace-nowrap">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-lg text-gray-600 sm:text-xl">
            Everything candidates ask before their first interview. Still curious?{" "}
            <Link
              href="#"
              className="font-semibold text-purple-600 transition-colors hover:text-purple-700"
            >
              Get in touch.
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 md:px-8">
        <Faq items={faqItems} />
      </section>
    </>
  );
}
