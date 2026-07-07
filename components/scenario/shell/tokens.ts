/**
 * Exact color tokens for the live-interview VS Code shell, transcribed from the
 * approved technical interview shell design.
 *
 * These are intentionally raw hex/rgba values rather than Tailwind theme colors:
 * the shell is a fixed dark "IDE" surface that does not follow the app's light/dark
 * token system, so pinning the palette here keeps every shell component in sync and
 * makes the mapping back to the design auditable in one place.
 */
export const shell = {
  // Surfaces
  appBg: "#0b0d11",
  topBar: "linear-gradient(180deg,#111419,#0d1014)",
  railBg: "#0d0f13",
  panelBg: "#0e1116",
  panelFooterBg: "#0c0f13",
  editorBg: "#1c1e24",
  tabBarBg: "#141619",
  breadcrumbBg: "#191b20",
  statusBarBg: "#0d1014",

  // Hairlines
  border: "rgba(255,255,255,.07)",
  borderSoft: "rgba(255,255,255,.06)",
  borderFaint: "rgba(255,255,255,.04)",

  // Brand
  brand: "linear-gradient(135deg,#3b82f6,#a855f7,#ec4899)",
  aiAccent: "#8ab4ff",

  // Text
  titleText: "#eef1f5",
  text: "#c4cad3",
  textMuted: "#8b95a3",
  textFaint: "#6b7684",
  textFainter: "#5f6b7a",

  // Category / info accents (blue)
  infoBg: "rgba(59,130,246,.14)",
  infoText: "#93b8ff",
  infoBorder: "rgba(59,130,246,.25)",

  // Neutral chip
  chipBg: "rgba(255,255,255,.05)",
  chipBorder: "rgba(255,255,255,.09)",
  chipText: "#e6e9ee",

  // Interviewer presence (green)
  presenceBg: "rgba(52,211,153,.06)",
  presenceBorder: "rgba(52,211,153,.18)",
  presenceAvatar: "linear-gradient(135deg,#10b981,#3b82f6)",
  presenceRing: "#34d399",
  presenceWave: "#34d399",
  presenceSpeaking: "#6ee7b7",

  // Hints (amber)
  hintBg: "rgba(245,158,11,.08)",
  hintBorder: "rgba(245,158,11,.18)",
  hintText: "#fde0a6",
  hintStrong: "#fde68a",
  hintIcon: "#fcd34d",
  hintButtonBg: "rgba(245,158,11,.06)",
  hintButtonBorder: "rgba(245,158,11,.28)",

  // Primary actions
  runGradient: "linear-gradient(180deg,#10b981,#059669)",
  runShadow: "0 6px 18px -6px rgba(16,185,129,.6)",
  nextBg: "#1d4ed8",

  // Editor chrome
  accent: "#3b82f6",
  tabInactiveText: "#7c8798",
  breadcrumbSep: "#4b5563",
  lineNumber: "#4b5563",
} as const;
