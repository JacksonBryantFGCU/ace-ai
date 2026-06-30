import { Minus, Plus } from "lucide-react";
import type { FaqItem } from "@/lib/marketing/faq";

/**
 * FAQ accordion. Server component — uses native `<details>`/`<summary>` so it
 * needs no client JS. Renders any `FaqItem[]`; `limit` shows a teaser subset.
 */
export function Faq({ items, limit }: { items: FaqItem[]; limit?: number }) {
  const shown = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <div className="mx-auto w-full space-y-4">
      {shown.map((item, i) => (
        <details key={i} className="glass-card group p-7 md:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span className="text-lg font-semibold text-gray-900 md:text-xl">{item.question}</span>
            <Plus className="size-6 shrink-0 text-purple-600 group-open:hidden" aria-hidden />
            <Minus className="hidden size-6 shrink-0 text-purple-600 group-open:block" aria-hidden />
          </summary>
          <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
