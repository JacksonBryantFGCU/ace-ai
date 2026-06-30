import { Star } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import type { Testimonial } from "@/lib/marketing/content";

/**
 * Social-proof section. Server component; quotes are passed in as props. The
 * default content is illustrative placeholder copy — replace with real,
 * attributable testimonials before launch.
 */
export function Testimonials({
  items,
  title,
  subtitle,
}: {
  items: Testimonial[];
  title: string;
  subtitle?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="testimonials-heading" className="mx-auto max-w-6xl px-6 py-16 md:px-8">
      <div id="testimonials-heading">
        <SectionHeading title={title} subtitle={subtitle} />
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((item, i) => (
          <li key={i} className="glass-card flex flex-col gap-5 p-6">
            <div className="flex gap-1" aria-label="Rated 5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="size-4 fill-amber-400 text-amber-400" aria-hidden />
              ))}
            </div>
            <blockquote className="flex-1 text-gray-700">“{item.quote}”</blockquote>
            <div className="flex items-center gap-3">
              <span
                className="size-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.role}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
