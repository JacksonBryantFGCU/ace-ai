/**
 * Marketing-site content (copy + structure), separated from presentation so the
 * section components stay pure and props-driven. Only describe functionality
 * that actually exists today — keep it honest.
 */

import {
  BarChart3,
  Briefcase,
  Code2,
  Database,
  MessageSquare,
  Mic,
  Monitor,
  RotateCcw,
  Server,
  Share2,
  Shield,
  Smartphone,
  Terminal,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ROLE_META } from "@/lib/constants";

export interface CtaLink {
  label: string;
  href: string;
}

/** Pastel accent used to tint section icon tiles. */
export type Tone = "blue" | "purple" | "pink";

export interface HeroContent {
  eyebrowBadge: string;
  eyebrowText: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  highlights: string[];
}

export const hero: HeroContent = {
  eyebrowBadge: "NEW",
  eyebrowText: "Voice-based AI interviews, live now",
  titleLine1: "Practice real interviews.",
  titleLine2: "Not just questions.",
  subtitle:
    "AI interviewers that talk back, push with real follow-ups, and grade you like a hiring panel — for behavioral and technical rounds alike.",
  primaryCta: { label: "Get started — it's free", href: "/signup" },
  secondaryCta: { label: "See how it works", href: "#how-it-works" },
  highlights: ["2 free interviews", "No card required"],
};

export interface Feature {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: MessageSquare,
    tone: "blue",
    title: "Behavioral interviews",
    description:
      "STAR-style questions with adaptive follow-ups that probe your real experience — just like a hiring manager.",
  },
  {
    icon: Code2,
    tone: "purple",
    title: "Technical interviews",
    description:
      "System design and problem-solving rounds with an in-browser code editor and a live multi-language runner.",
  },
  {
    icon: Mic,
    tone: "pink",
    title: "Voice AI interviewer",
    description:
      "Speak your answers out loud and hear the interviewer respond in real time. Practice the pressure, not just the prose.",
  },
  {
    icon: Terminal,
    tone: "blue",
    title: "Live coding",
    description:
      "Write and run code mid-interview while you talk through your approach — exactly how real technical rounds work.",
  },
  {
    icon: RotateCcw,
    tone: "purple",
    title: "Replay & transcript",
    description:
      "Rewatch any interview with the full transcript and per-answer notes, so you can see exactly where you drifted.",
  },
  {
    icon: BarChart3,
    tone: "pink",
    title: "Analytics & progress",
    description:
      "Track scores over time, spot weak areas, and watch your readiness climb interview after interview.",
  },
];

/* ------------------------------------------------------------------ */
/* Features page (/features) — deeper-dive content beyond the home grid */
/* ------------------------------------------------------------------ */

export const featuresHero = {
  eyebrow: "Features",
  title: "Everything that makes practice feel real",
  subtitle:
    "Nine capabilities that turn a quiet afternoon into a high-pressure interview — and a clear plan to improve.",
  cta: { label: "Get started free", href: "/signup" } satisfies CtaLink,
};

/** Which bespoke mock visual a spotlight renders alongside its copy. */
export type SpotlightVisual = "chat" | "code" | "voice";

export interface FeatureSpotlight {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  visual: SpotlightVisual;
  /** When true, the visual sits on the left and copy on the right. */
  reverse?: boolean;
}

/** The three headline features, each paired with an illustrative mock. */
export const featureSpotlights: FeatureSpotlight[] = [
  {
    icon: MessageSquare,
    tone: "blue",
    title: "Behavioral interviews",
    description:
      'Work through STAR-style questions with an interviewer that listens to your story and asks the natural next question — "what would you do differently?", "how did the team react?" — instead of marching down a fixed list.',
    visual: "chat",
  },
  {
    icon: Code2,
    tone: "purple",
    title: "Technical interviews",
    description:
      "Tackle problem-solving and system-design rounds where you explain your thinking out loud while the interviewer probes trade-offs, edge cases, and complexity — the way a real technical screen actually flows.",
    visual: "code",
    reverse: true,
  },
  {
    icon: Mic,
    tone: "pink",
    title: "Voice AI interviewer",
    description:
      "Real interviews happen out loud. Speak your answers and hear the interviewer respond in natural, low-latency voice — so you rehearse pacing, filler words, and nerves, not just the words on a page.",
    visual: "voice",
  },
];

/** The four supporting features shown as a card grid below the spotlights. */
export const featureCards: Feature[] = [
  {
    icon: Terminal,
    tone: "blue",
    title: "Live coding",
    description:
      "A built-in editor with a multi-language runner. Write, run, and debug while you talk — no separate window, no copy-paste.",
  },
  {
    icon: RotateCcw,
    tone: "purple",
    title: "Replay & transcript",
    description:
      "Every session is saved with a full transcript and per-answer notes. Rewatch, reread, and catch what you missed.",
  },
  {
    icon: BarChart3,
    tone: "pink",
    title: "Analytics",
    description:
      "Scores by competency, trends over time, and your strongest and weakest areas at a glance.",
  },
  {
    icon: TrendingUp,
    tone: "blue",
    title: "Progress tracking",
    description:
      'Watch your readiness climb session over session, with a clear "what to practice next" each time.',
  },
  {
    icon: Briefcase,
    tone: "purple",
    title: "Role-tailored questions",
    description:
      "Eight role tracks — frontend to security — with questions and scoring matched to your target role and seniority.",
  },
  {
    icon: Users,
    tone: "pink",
    title: "Choose your interviewer",
    description:
      "Three interviewer personalities, from warm-but-sharp to direct-and-technical, plus adjustable difficulty and strictness.",
  },
];

/** A numbered step in the "How it works" flow (the number is the list index). */
export interface Step {
  title: string;
  description: string;
}

export const steps: Step[] = [
  {
    title: "Pick a role",
    description: "Choose your target role and seniority — frontend, backend, full-stack, and more.",
  },
  {
    title: "Configure",
    description: "Behavioral or technical, difficulty, and interviewer style — set in seconds.",
  },
  {
    title: "Interview",
    description: "Talk through a realistic round with an AI that listens and follows up.",
  },
  {
    title: "Get scored",
    description: "Receive an AI evaluation with strengths, gaps, and a clear next step.",
  },
];

/* ------------------------------------------------------------------ */
/* How it works page (/how-it-works) — the full step-by-step loop      */
/* ------------------------------------------------------------------ */

export const howItWorksHero = {
  eyebrow: "How it works",
  title: "Eight steps from nervous to ready",
  subtitle: "The whole loop takes minutes — and every time around, you get a little sharper.",
};

/** The full eight-step loop (the number is the list index + 1). */
export const howItWorksSteps: Step[] = [
  {
    title: "Sign up",
    description:
      "Create your account in seconds. Your free interview is unlocked immediately — no card required.",
  },
  {
    title: "Choose your role",
    description:
      "Pick the track that matches your target job — frontend, backend, full-stack, DevOps, and more.",
  },
  {
    title: "Configure the interview",
    description:
      "Behavioral or technical, difficulty level, and interviewer style — all set before you begin.",
  },
  {
    title: "Take the interview",
    description:
      "Speak with the AI interviewer in real time. It listens, follows up, and keeps the pressure realistic.",
  },
  {
    title: "Receive your AI evaluation",
    description:
      "Get a structured score with concrete strengths, gaps, and specific suggestions — within moments of finishing.",
  },
  {
    title: "Review the transcript",
    description:
      "Replay the full conversation with per-answer notes to see exactly where you shone and where you stumbled.",
  },
  {
    title: "Track your progress",
    description:
      "Each interview feeds your analytics — scores trend up and your weak areas come into focus.",
  },
  {
    title: "Improve & repeat",
    description:
      "Run another round targeting your gaps. Practice compounds — and so does your confidence.",
  },
];

export const howItWorksCta = { label: "Start the loop free", href: "/signup" } satisfies CtaLink;

/* ------------------------------------------------------------------ */
/* Interview types page (/interview-types) — the role tracks            */
/* ------------------------------------------------------------------ */

export const interviewTracksHero = {
  eyebrow: "Interview types",
  title: "Practice for your exact role",
  subtitle:
    "Each track tailors questions, difficulty, and follow-ups to the role you're targeting. Pick one and your first round is free.",
};

export interface InterviewTrack {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  /** Sample focus topics shown as chips. */
  tags: string[];
}

/** The eight role tracks (mirrors the in-app `ROLE_META` allow-list). */
export const interviewTracks: InterviewTrack[] = [
  {
    icon: Terminal,
    tone: "blue",
    title: "Frontend",
    description: "UI architecture, rendering performance, accessibility, and framework trade-offs.",
    tags: ["React", "State mgmt", "Web perf"],
  },
  {
    icon: Database,
    tone: "purple",
    title: "Backend",
    description: "APIs, data modeling, concurrency, and designing systems that scale.",
    tags: ["Databases", "APIs", "Caching"],
  },
  {
    icon: Monitor,
    tone: "pink",
    title: "Full Stack",
    description: "End-to-end feature design spanning UI, services, and the data layer.",
    tags: ["System design", "Trade-offs"],
  },
  {
    icon: Share2,
    tone: "blue",
    title: "Machine Learning",
    description: "Model design, evaluation metrics, and productionizing ML systems end to end.",
    tags: ["Modeling", "Evaluation"],
  },
  {
    icon: Smartphone,
    tone: "purple",
    title: "Mobile",
    description: "Native and cross-platform app architecture, performance, and the app lifecycle.",
    tags: ["iOS / Android", "Performance"],
  },
  {
    icon: Workflow,
    tone: "pink",
    title: "DevOps",
    description: "CI/CD, observability, incident response, and infrastructure as code.",
    tags: ["Pipelines", "Monitoring"],
  },
  {
    icon: Shield,
    tone: "blue",
    title: "Cybersecurity",
    description: "Threat modeling, secure design, incident handling, and risk trade-offs.",
    tags: ["AppSec", "Threats"],
  },
  {
    icon: Server,
    tone: "purple",
    title: "Systems Engineering",
    description: "Low-level design, concurrency, performance, and reliability of core systems.",
    tags: ["Concurrency", "Reliability"],
  },
];

export const interviewTracksRequest = {
  title: "Don't see your exact role?",
  subtitle:
    "Every track works for behavioral and technical rounds, and new categories ship regularly. Tell us what you're prepping for.",
  cta: { label: "Request a track", href: "#" } satisfies CtaLink,
};

export interface ChecklistItem {
  /** Bold lead-in, e.g. "Adaptive follow-ups." */
  lead: string;
  text: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface WhyContent {
  eyebrow: string;
  title: string;
  paragraph: string;
  checklist: ChecklistItem[];
  stats: Stat[];
}

export const why: WhyContent = {
  eyebrow: "Why ACE.AI",
  title: "Reading answers won't get you the offer. Practice will.",
  paragraph:
    "Question lists tell you what might be asked. ACE.AI makes you actually do it — under time, out loud, with follow-ups you can't predict — then shows you where you lost the room.",
  checklist: [
    {
      lead: "Adaptive follow-ups.",
      text: "The AI digs into your answers instead of reading a script.",
    },
    {
      lead: "Honest scoring.",
      text: "Structured feedback on what worked and what to fix — no vague pep talk.",
    },
    {
      lead: "Practice anytime.",
      text: "No scheduling a peer or coach. Run a round at 2am if that's when nerves hit.",
    },
  ],
  stats: [
    { value: "25 min", label: "full mock round, multiple questions" },
    { value: "2 modes", label: "behavioral & technical" },
    { value: `${ROLE_META.length}+`, label: "role tracks to choose from" },
    { value: "24/7", label: "practice on your schedule" },
  ],
};

/** One scored competency shown in the analytics card. Mirrors the real
 *  evaluation categories (each scored 0–100). */
export interface CompetencyScore {
  label: string;
  /** 0–100, matching the in-app scoring scale. */
  score: number;
  /** Accent for the score — warns on weaker areas worth drilling. */
  tone: "good" | "warn";
}

export interface AnalyticsContent {
  eyebrow: string;
  title: string;
  paragraph: string;
  cta: CtaLink;
  /** Readiness card data driving the mock dashboard preview. */
  readiness: {
    label: string;
    score: number;
    outOf: number;
    trend: string;
    /** Relative bar heights (0–1) for the trend chart, oldest → newest. */
    bars: number[];
    competencies: CompetencyScore[];
  };
}

export const analytics: AnalyticsContent = {
  eyebrow: "See yourself improve",
  title: "Analytics that turn practice into a plan",
  paragraph:
    "Every interview feeds a running picture of your readiness — scores by competency, trends over time, and the weak areas worth drilling next.",
  cta: { label: "Explore analytics", href: "/dashboard" },
  readiness: {
    label: "Readiness score",
    score: 82,
    outOf: 100,
    trend: "+14% this month",
    bars: [0.4, 0.46, 0.42, 0.58, 0.62, 0.86, 1],
    competencies: [
      { label: "Communication", score: 88, tone: "good" },
      { label: "Technical", score: 74, tone: "warn" },
      { label: "Problem solving", score: 84, tone: "good" },
    ],
  },
};

export interface InterviewType {
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
}

export const interviewTypes: InterviewType[] = [
  {
    icon: Mic,
    title: "Behavioral",
    description:
      "Spoken, STAR-style questions about your experience, with adaptive follow-ups that probe your reasoning.",
    points: ["Real-time voice conversation", "Adaptive follow-up questions", "Communication scoring"],
  },
  {
    icon: Code2,
    title: "Technical",
    description:
      "A voice discussion plus coding problems you solve in a live editor, gated on passing the tests.",
    points: ["In-browser code editor", "Run against test cases", "Problem-by-problem progression"],
  },
];

/** Engineering roles you can practice (from the in-app role allow-list). */
export const roleLabels: string[] = ROLE_META.map((r) => r.label);

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

/**
 * PLACEHOLDER testimonials — illustrative copy to validate the layout. Replace
 * with real, attributable quotes before launch (do not present these as real).
 */
export const testimonials: Testimonial[] = [
  {
    quote:
      "[Sample testimonial — the follow-up questions caught the exact thing my real interviewer pushed on. Felt like a dress rehearsal.]",
    name: "[Candidate Name]",
    role: "[Frontend Engineer]",
  },
  {
    quote:
      "[Sample testimonial — I did six mock rounds the week before my onsite. The analytics showed me exactly what to drill.]",
    name: "[Candidate Name]",
    role: "[Backend Engineer]",
  },
  {
    quote:
      "[Sample testimonial — talking out loud to the voice AI was the practice I didn't know I needed. Way less nervous on the day.]",
    name: "[Candidate Name]",
    role: "[PM Candidate]",
  },
];

export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: CtaLink;
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    description: "Try the full product — both modes.",
    features: ["1 full practice interview", "AI evaluation & transcript", "Behavioral & technical"],
    cta: { label: "Get started free", href: "/signup" },
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    description: "Unlimited practice until you land it.",
    features: [
      "Unlimited interviews",
      "Full analytics & progress tracking",
      "All role tracks & difficulties",
      "Priority access to new features",
    ],
    cta: { label: "Upgrade to Pro", href: "/signup" },
    highlighted: true,
  },
];

/**
 * Feature-by-feature comparison between the Free and Pro tiers, rendered as a
 * table on the pricing page. A `true`/`false` value renders a check / dash; a
 * string renders verbatim (e.g. "Unlimited", "Limited").
 */
export interface PlanComparisonRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
}

export const planComparison: PlanComparisonRow[] = [
  { feature: "Interviews", free: "2 total", pro: "Unlimited" },
  { feature: "Behavioral & technical modes", free: true, pro: true },
  { feature: "Voice AI interviewer", free: true, pro: true },
  { feature: "Live coding environment", free: true, pro: true },
  { feature: "AI evaluation & transcript", free: true, pro: true },
  { feature: "Analytics & progress tracking", free: false, pro: true },
  { feature: "Full interview history", free: false, pro: true },
  { feature: "All role tracks & difficulties", free: "Limited", pro: true },
  { feature: "Priority access to new features", free: false, pro: true },
];

export const finalCta = {
  title: "Your next interview is coming. Walk in ready.",
  subtitle: "Create an account and run your first AI interview free — no card, no catch.",
  cta: { label: "Get started — it's free", href: "/signup" } satisfies CtaLink,
};
