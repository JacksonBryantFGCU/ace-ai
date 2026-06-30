import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Data-driven FAQ content for the marketing site. The `faq.tsx` component renders
 * any `FaqItem[]`, so the landing page can show a teaser subset while `/faq`
 * shows the full list — no markup duplication.
 *
 * Answers are `ReactNode` so they can include inline links. Keep them honest:
 * only describe functionality that actually exists today.
 */

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export const faqItems: FaqItem[] = [
  {
    question: "What exactly is ACE.AI?",
    answer:
      "ACE.AI is an AI-powered interview practice platform. You take realistic behavioral and technical mock interviews — spoken out loud with a voice AI — and get a structured evaluation, transcript, and progress tracking so you walk into the real thing prepared.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No downloads. ACE.AI runs entirely in your browser. For voice interviews you'll just grant microphone access when prompted.",
  },
  {
    question: "Are the free interviews really free?",
    answer:
      "Yes. Create an account and run two complete interviews — one behavioral and one technical — with the full voice experience, AI evaluation, and transcripts included, and no credit card required.",
  },
  {
    question: "Why do I need an account for the free interviews?",
    answer:
      "Your account is what saves your interview, evaluation, and transcript so you can review them later — and it's how we keep your free interview tied to you.",
  },
  {
    question: "What do the passes include?",
    answer:
      "A Day Pass ($5) gives you 24 hours of unlimited interviews, and a Week Pass ($15) gives you 7 days — both with full analytics and progress tracking, complete interview history, and every role track and difficulty level. Passes are one-time payments, not subscriptions.",
  },
  {
    question: "Is it a subscription? Can I cancel?",
    answer:
      "No subscription — passes are one-time payments, so there's nothing to cancel. Buy a pass when you have an interview coming up; when it expires you simply drop back to the free tier with no further charges. Buying another pass while one is active just adds the time on top.",
  },
  {
    question: "How realistic are the interviews?",
    answer:
      "The AI adapts to your answers with genuine follow-up questions and keeps the pace and pressure of a live round. Technical interviews include real code you write and run while you explain your thinking.",
  },
  {
    question: "Which roles are supported?",
    answer: (
      <>
        Frontend, Backend, Full Stack, DevOps, Cloud, Data Engineering, Cybersecurity, and Product
        Management — with more added regularly.{" "}
        <Link
          href="/interview-types"
          className="font-semibold text-purple-600 transition-colors hover:text-purple-700"
        >
          See all interview types
        </Link>
        .
      </>
    ),
  },
  {
    question: "Is my data private?",
    answer:
      "Your interviews and transcripts are tied to your account and visible only to you. See our privacy policy for the full details on how data is handled.",
  },
];
