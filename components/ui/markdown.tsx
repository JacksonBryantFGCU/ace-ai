import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

/**
 * Application-wide Markdown renderer. GitHub-flavoured (tables, task lists) with
 * syntax-highlighted fenced code (rehype-highlight → `.markdown-body` theme in
 * globals.css). Every element is styled to the design system here, so callers get
 * consistent, accessible output with no per-site styling.
 *
 * Safe by default: react-markdown does not render raw HTML (no rehype-raw), so
 * authored content can't inject markup. Long content wraps; code blocks and tables
 * scroll horizontally inside their own container rather than breaking the layout.
 *
 * `headingBaseLevel` shifts heading tags (not their visual size) so embedded
 * content keeps a valid outline under whatever heading precedes it — e.g. a prompt
 * under an `<h2>` passes `3` so its `#` becomes an `<h3>`.
 */

type Level = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_CLASS: Record<Level, string> = {
  1: "mt-4 mb-2 text-lg font-semibold text-white",
  2: "mt-4 mb-2 text-base font-semibold text-white",
  3: "mt-3 mb-1.5 text-sm font-semibold text-white",
  4: "mt-3 mb-1.5 text-sm font-semibold text-gray-200",
  5: "mt-2 mb-1 text-sm font-medium text-gray-200",
  6: "mt-2 mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase",
};

function makeHeading(level: Level, base: number) {
  const clamped = Math.min(6, base + level - 1);
  const Tag = `h${clamped}` as keyof React.JSX.IntrinsicElements;
  function Heading({ children }: { children?: ReactNode }) {
    return <Tag className={HEADING_CLASS[level]}>{children}</Tag>;
  }
  Heading.displayName = `MarkdownH${level}`;
  return Heading;
}

function buildComponents(base: number): Components {
  return {
    h1: makeHeading(1, base),
    h2: makeHeading(2, base),
    h3: makeHeading(3, base),
    h4: makeHeading(4, base),
    h5: makeHeading(5, base),
    h6: makeHeading(6, base),
    p: ({ children }) => <p className="my-2 leading-relaxed text-gray-100">{children}</p>,
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-5 text-gray-100 marker:text-gray-500">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5 text-gray-100 marker:text-gray-500">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
        className="text-blue-400 underline underline-offset-2 hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-white/20 pl-3 text-gray-300 italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-3 border-white/10" />,
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-md border border-white/10 bg-[#1e1e1e] p-3 text-[13px] leading-relaxed">
        {children}
      </pre>
    ),
    code: ({ className, children }: ComponentPropsWithoutRef<"code">) => (
      // Inline styling here; block code inside <pre> is reset by `.markdown-body pre code`.
      <code className={cn("rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-gray-100", className)}>
        {children}
      </code>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto rounded-md border border-white/10">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-white/15 bg-white/5 px-2 py-1 text-left font-semibold text-gray-200">
        {children}
      </th>
    ),
    td: ({ children }) => <td className="border-b border-white/5 px-2 py-1 align-top text-gray-100">{children}</td>,
  };
}

export function Markdown({
  children,
  className,
  headingBaseLevel = 1,
}: {
  children: string;
  className?: string;
  headingBaseLevel?: number;
}) {
  return (
    <div
      className={cn(
        "markdown-body text-sm text-gray-100 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={buildComponents(headingBaseLevel)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
