"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { saveSetupDraft } from "@/actions/interview";
import { getVapi, unlockAudio, type VapiAssistantConfig } from "@/lib/vapi";
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  INTERVIEWERS,
  QUESTION_TYPES,
  ROLE_LABELS,
  STRICTNESS_LEVELS,
  TOPIC_CATEGORIES,
  VALID_ROLES,
  getInterviewer,
  type EngineerRole,
} from "@/lib/constants";
import { EXECUTABLE_LANGUAGES, LANGUAGES } from "@/lib/languages";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StopSlider } from "@/components/setup/stop-slider";
import { InterviewerCard } from "@/components/setup/interviewer-card";
import type {
  Difficulty,
  ExperienceLevel,
  ProgrammingLanguage,
  QuestionType,
  Strictness,
  VapiInterviewConfig,
} from "@/types/interview";

/** Legacy strictness wording (the data model uses lenient/balanced/strict). */
const STRICTNESS_LABELS: Record<Strictness, string> = {
  lenient: "Relaxed",
  balanced: "Standard",
  strict: "Strict",
};

export function SetupForm({
  initialRole,
  locked = false,
}: {
  initialRole: EngineerRole;
  /** When true the free allowance is used up — show an upgrade CTA, not Start. */
  locked?: boolean;
}) {
  const [role, setRole] = useState<EngineerRole>(initialRole);
  const [questionType, setQuestionType] = useState<QuestionType>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [strictness, setStrictness] = useState<Strictness>("balanced");
  const [experience, setExperience] = useState<ExperienceLevel>("junior");
  const [interviewerId, setInterviewerId] = useState<string>(INTERVIEWERS[0]!.id);
  const [language, setLanguage] = useState<ProgrammingLanguage>("javascript");
  const [topics, setTopics] = useState<string[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeBlocked, setUpgradeBlocked] = useState(locked);
  const [pending, startTransition] = useTransition();

  const previewCleanupRef = useRef<(() => void) | null>(null);
  const interviewer = getInterviewer(interviewerId);

  // Stop any active preview when this component unmounts.
  useEffect(() => () => previewCleanupRef.current?.(), []);

  async function previewVoice(id: string) {
    if (previewCleanupRef.current) {
      previewCleanupRef.current();
      await new Promise<void>((r) => setTimeout(r, 200));
    }

    const selected = getInterviewer(id);
    const previewText = `Hi, I'm ${selected.name}. I'll be your interviewer today.`;
    setPreviewingId(selected.id);

    const vapi = getVapi();
    let cleaned = false;
    // Declared up front so the cleanup closures below can clear it; assigned
    // after the handlers are defined.
    // eslint-disable-next-line prefer-const
    let safetyTimeout: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(safetyTimeout);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("call-end", onCallEnd);
      vapi.removeListener("error", onError);
      setPreviewingId(null);
      previewCleanupRef.current = null;
      void vapi.stop();
    };

    // call-end fires after vapi.stop() — don't call stop() again from here.
    const onCallEnd = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(safetyTimeout);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("error", onError);
      setPreviewingId(null);
      previewCleanupRef.current = null;
    };
    const onSpeechEnd = () => cleanup();
    const onError = (e: unknown) => {
      console.error("Voice preview error:", e);
      cleanup();
    };

    safetyTimeout = setTimeout(cleanup, 12000);
    previewCleanupRef.current = cleanup;
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);

    try {
      await unlockAudio();
      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You have just introduced yourself. Stay silent and wait — the user is only previewing your voice.",
            },
          ],
        },
        voice: selected.voice,
        transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
        firstMessage: previewText,
      } as unknown as VapiAssistantConfig);
    } catch (err) {
      console.error("Voice preview failed:", err);
      cleanup();
    }
  }

  function toggleTopic(id: string) {
    setTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleStart() {
    setError(null);
    previewCleanupRef.current?.();
    const config: VapiInterviewConfig = {
      role,
      difficulty,
      experience,
      strictness,
      questionType,
      interviewer: interviewerId,
      // Language + focus topics only apply to technical (coding) interviews.
      ...(questionType === "technical" ? { language, topics } : {}),
    };
    startTransition(async () => {
      const res = await saveSetupDraft(config);
      // Success redirects server-side; only an error returns.
      if (res && !res.ok) {
        setError(res.error);
        if (res.reason === "upgrade") setUpgradeBlocked(true);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration panel */}
      <div className="glass-card space-y-8 p-8">
        <div>
          <label htmlFor="role" className="mb-3 block text-sm font-medium text-gray-700">
            Role
          </label>
          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as EngineerRole)}
              className="w-full appearance-none rounded-xl border border-white/60 bg-white/60 py-3 pr-10 pl-4 text-gray-900 shadow-sm backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
            >
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] ?? titleCase(r)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-gray-700">Question Type</p>
          <div className="flex gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setQuestionType(type)}
                aria-pressed={questionType === type}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  questionType === type
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                    : "bg-white/60 text-gray-700 hover:bg-white/80",
                )}
              >
                {titleCase(type)}
              </button>
            ))}
          </div>
        </div>

        {questionType === "technical" ? (
          <>
            <div>
              <label htmlFor="language" className="mb-3 block text-sm font-medium text-gray-700">
                Language
              </label>
              <div className="relative">
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                  className="w-full appearance-none rounded-xl border border-white/60 bg-white/60 py-3 pr-10 pl-4 text-gray-900 shadow-sm backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none"
                >
                  {EXECUTABLE_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {LANGUAGES[l].label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Focus Topics</p>
                <span className="text-xs text-gray-400">
                  {topics.length === 0 ? "All topics" : `${topics.length} selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TOPIC_CATEGORIES.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    aria-pressed={topics.includes(topic.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      topics.includes(topic.id)
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm"
                        : "border border-gray-200 bg-white/60 text-gray-600 hover:bg-white/80",
                    )}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <StopSlider
          label="Question Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={setDifficulty}
          optionLabel={titleCase}
        />

        <StopSlider
          label="Interviewer Strictness"
          options={STRICTNESS_LEVELS}
          value={strictness}
          onChange={setStrictness}
          optionLabel={(v) => STRICTNESS_LABELS[v]}
        />

        <StopSlider
          label="Experience Level"
          options={EXPERIENCE_LEVELS}
          value={experience}
          onChange={setExperience}
          optionLabel={titleCase}
        />
      </div>

      {/* Interviewer panel */}
      <div className="space-y-6">
        <div className="glass-card p-8">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Your Interviewer</h2>

          <div className="mb-6 flex justify-center">
            <div
              className={cn(
                "flex size-32 items-center justify-center rounded-full bg-gradient-to-br shadow-lg",
                interviewer.gradient,
              )}
            >
              <span className="text-4xl font-bold text-white">{interviewer.name.charAt(0)}</span>
            </div>
          </div>

          <h3 className="mb-6 text-center text-2xl font-bold text-gray-900">{interviewer.name}</h3>

          <div className="mb-5 flex justify-center gap-3">
            {INTERVIEWERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setInterviewerId(option.id)}
                aria-label={option.name}
                aria-pressed={interviewerId === option.id}
                className={cn(
                  "size-12 rounded-full bg-gradient-to-br transition-all",
                  option.gradient,
                  interviewerId === option.id
                    ? "scale-110 ring-4 ring-blue-500"
                    : "opacity-50 hover:opacity-100",
                )}
              />
            ))}
          </div>

          <InterviewerCard
            interviewerId={interviewer.id}
            isPreviewing={previewingId === interviewer.id}
            onPreviewVoice={() => void previewVoice(interviewer.id)}
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {upgradeBlocked ? (
          <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/50 p-5 text-center">
            <p className="text-sm text-gray-700">
              You&apos;ve used your free interviews. Grab a day or week pass for unlimited practice.
            </p>
            <Link
              href="/pricing"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              <Sparkles className="size-5" />
              View passes
            </Link>
          </div>
        ) : (
          <Button
            variant="brand"
            onClick={handleStart}
            disabled={pending}
            className="h-14 w-full rounded-xl text-base"
          >
            {pending ? "Starting…" : "Start Interview"}
          </Button>
        )}
      </div>
    </div>
  );
}
