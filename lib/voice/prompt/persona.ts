/**
 * Interviewer personas for the voice client. Reuses the existing interviewer roster
 * (`lib/constants`) so voice + the legacy islands share one set of voices/
 * personalities. A persona is purely presentational + prompt-shaping data; adding
 * one is a data change, no code (extension point in the architecture doc §13).
 */

import { INTERVIEWERS, DEFAULT_INTERVIEWER_ID, getInterviewer } from "@/lib/constants";
import type { Interviewer } from "@/lib/constants";
import type { VoicePersona } from "@/lib/voice/provider";

function toPersona(interviewer: Interviewer): VoicePersona {
  return {
    id: interviewer.id,
    displayName: interviewer.name,
    personality: interviewer.personality,
    voice: interviewer.voice,
  };
}

/** All available voice personas (mirrors the interviewer roster). */
export const VOICE_PERSONAS: readonly VoicePersona[] = INTERVIEWERS.map(toPersona);

export const DEFAULT_PERSONA_ID = DEFAULT_INTERVIEWER_ID;

/** Resolve a persona by id, falling back to the default (never throws). */
export function resolvePersona(id: string | undefined): VoicePersona {
  return toPersona(getInterviewer(id));
}
