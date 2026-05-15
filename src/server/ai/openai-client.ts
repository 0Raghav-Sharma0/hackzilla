import OpenAI from "openai";
import { getServerEnv } from "@/lib/env/server";

let client: OpenAI | null = null;

/** Lazy OpenAI client — WHY: Avoid constructing when `OPENAI_API_KEY` absent in non-AI environments. */
export function getOpenAI(): OpenAI {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 2, timeout: 30_000 });
  }
  return client;
}
