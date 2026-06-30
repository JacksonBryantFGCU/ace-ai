/**
 * Shared marketing section heading: optional eyebrow + title + optional subtitle,
 * with consistent spacing and hierarchy. Server component, props-driven.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl";
  return (
    <div className={`${alignment} space-y-3`}>
      {eyebrow ? (
        <p className="text-sm font-bold tracking-widest text-purple-600 uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {subtitle ? <p className="text-lg text-gray-600 sm:text-xl">{subtitle}</p> : null}
    </div>
  );
}
