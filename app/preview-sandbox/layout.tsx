import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * No app chrome — this route is only ever loaded inside the sandboxed preview
 * iframe (`components/scenario/preview/component-preview-frame.tsx`), never
 * navigated to directly.
 */
export default function PreviewSandboxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
