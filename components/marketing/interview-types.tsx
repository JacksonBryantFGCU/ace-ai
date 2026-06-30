import { Check } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import type { InterviewType } from "@/lib/marketing/content";

/**
 * Interview types (behavioral / technical) + the roles you can practice. Server
 * component; types and role labels are passed in as props.
 */
export function InterviewTypes({
  types,
  roleLabels,
  title,
  subtitle,
}: {
  types: InterviewType[];
  roleLabels: string[];
  title: string;
  subtitle?: string;
}) {
  return (
    <section
      id="interview-types"
      aria-labelledby="interview-types-heading"
      className="mx-auto max-w-6xl px-6 py-16 md:px-8"
    >
      <div id="interview-types-heading">
        <SectionHeading title={title} subtitle={subtitle} />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {types.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.title} className="glass-card flex flex-col gap-4 p-8">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                <Icon className="size-6" />
              </span>
              <h3 className="text-xl font-semibold text-gray-900">{type.title}</h3>
              <p className="text-gray-600">{type.description}</p>
              <ul className="space-y-2">
                {type.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="size-4 shrink-0 text-green-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="mb-4 text-sm font-medium text-gray-500">Practice for roles including</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {roleLabels.map((label) => (
            <li
              key={label}
              className="rounded-full border border-white/60 bg-white/60 px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
