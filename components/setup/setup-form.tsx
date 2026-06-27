"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Volume2 } from "lucide-react";
import { saveSetupDraft } from "@/actions/interview";
import { getVapi, unlockAudio, type VapiAssistantConfig } from "@/lib/vapi";
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  INTERVIEWERS,
  QUESTION_TYPES,
  STRICTNESS_LEVELS,
  VALID_ROLES,
  getInterviewer,
} from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  Difficulty,
  ExperienceLevel,
  QuestionType,
  Strictness,
  VapiInterviewConfig,
} from "@/types/interview";

const ROLE_LABELS: Record<string, string> = {
  frontend: "Frontend Engineer",
  backend: "Backend Engineer",
  fullstack: "Full-Stack Engineer",
  ml: "Machine Learning Engineer",
  mobile: "Mobile Developer",
  devops: "DevOps Engineer",
  security: "Cybersecurity Engineer",
  systems: "Systems Engineer",
};

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            value === option
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background hover:bg-accent"
          }`}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

export function SetupForm() {
  const [role, setRole] = useState<string>("backend");
  const [questionType, setQuestionType] = useState<QuestionType>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [strictness, setStrictness] = useState<Strictness>("balanced");
  const [experience, setExperience] = useState<ExperienceLevel>("mid");
  const [interviewerId, setInterviewerId] = useState<string>(INTERVIEWERS[0]!.id);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    };
    startTransition(async () => {
      const res = await saveSetupDraft(config);
      // Success redirects server-side; only an error returns.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration */}
      <div className="border-border space-y-6 rounded-2xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            {VALID_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? titleCase(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Question type</Label>
          <Segmented
            options={QUESTION_TYPES}
            value={questionType}
            onChange={setQuestionType}
            label={titleCase}
          />
          {questionType === "technical" ? (
            <p className="text-muted-foreground text-xs">
              Technical interviews (coding problems) arrive in a later phase.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Segmented
            options={DIFFICULTIES}
            value={difficulty}
            onChange={setDifficulty}
            label={titleCase}
          />
        </div>

        <div className="space-y-2">
          <Label>Interviewer strictness</Label>
          <Segmented
            options={STRICTNESS_LEVELS}
            value={strictness}
            onChange={setStrictness}
            label={titleCase}
          />
        </div>

        <div className="space-y-2">
          <Label>Experience level</Label>
          <Segmented
            options={EXPERIENCE_LEVELS}
            value={experience}
            onChange={setExperience}
            label={titleCase}
          />
        </div>
      </div>

      {/* Interviewer */}
      <div className="space-y-6">
        <div className="border-border rounded-2xl border p-6">
          <h2 className="mb-6 text-lg font-semibold">Your interviewer</h2>

          <div className="mb-6 flex justify-center">
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${interviewer.gradient}`}
            >
              <span className="text-4xl font-bold text-white">{interviewer.name.charAt(0)}</span>
            </div>
          </div>

          <h3 className="mb-4 text-center text-xl font-bold">{interviewer.name}</h3>

          <div className="mb-5 flex justify-center gap-3">
            {INTERVIEWERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setInterviewerId(option.id)}
                aria-label={option.name}
                aria-pressed={interviewerId === option.id}
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${option.gradient} transition-all ${
                  interviewerId === option.id
                    ? "ring-primary scale-110 ring-4"
                    : "opacity-50 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <p className="text-muted-foreground mb-4 text-center text-sm">{interviewer.personality}</p>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void previewVoice(interviewer.id)}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              {previewingId === interviewer.id ? "Previewing…" : "Preview voice"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-500 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button size="lg" className="w-full" onClick={handleStart} disabled={pending}>
          {pending ? "Starting…" : "Start interview"}
        </Button>
      </div>
    </div>
  );
}
