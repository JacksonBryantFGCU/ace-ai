import type { Step } from "@/lib/marketing/content";

/**
 * Vertical numbered timeline for the "How it works" flow. Server component;
 * takes the ordered step list as a prop. Each step shows a gradient number badge
 * with a connector line running down to the next step.
 */
export function StepsTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.title} className="relative flex gap-5 pb-10 last:pb-0">
            {/* Connector line (skipped on the last step) */}
            {!isLast ? (
              <span
                aria-hidden
                className="absolute top-12 bottom-0 left-[22px] w-px -translate-x-1/2 bg-gray-200"
              />
            ) : null}

            <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 text-base font-bold text-white shadow-sm">
              {i + 1}
            </span>

            <div className="space-y-1.5 pt-1.5">
              <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="max-w-2xl leading-relaxed text-gray-600">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
