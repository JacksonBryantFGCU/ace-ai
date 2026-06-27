import "server-only";

import OpenAI from "openai";
import { getOpenAIKey } from "@/config/env.server";

/** Lazy OpenAI client singleton. The key is read only when first used. */
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: getOpenAIKey() });
  return client;
}
