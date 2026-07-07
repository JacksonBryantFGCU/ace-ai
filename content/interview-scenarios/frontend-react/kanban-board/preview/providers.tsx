import type { ReactNode } from "react";

/**
 * Shared preview chrome — a thin, class-based wrapper. All appearance comes from
 * the shared `.preview-frame`/`.preview-canvas` design tokens (app/globals.css)
 * plus this scenario's optional `preview/preview.css`, so the base look is
 * consistent across scenarios and customizable per scenario without editing this
 * file. `theme` is surfaced as a `data-theme` attribute the CSS tokens react to;
 * it never touches the host application's own theme (isolated, docs §14).
 */
export function Frame({ theme = "light", children }: { theme?: "light" | "dark"; children: ReactNode }) {
  return (
    <div className="preview-frame" data-theme={theme}>
      {children}
    </div>
  );
}
