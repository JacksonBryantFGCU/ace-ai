import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  // Landing is the canonical, indexable entry point.
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  description: siteConfig.description,
  applicationCategory: "EducationApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for the public landing page only.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Practice engineering interviews, out loud.
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-pretty">
          {siteConfig.description}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Start practicing
          </Link>
          <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Log in
          </Link>
        </div>
      </section>
    </>
  );
}
