import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Groq: free tier, OpenAI-compatible endpoint, no credit card. console.groq.com */
export function createAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// Groq deprecated its Llama chat models in Aug 2026; gpt-oss-120b is the
// current general-purpose replacement (console.groq.com/docs/deprecations).
export const CHAT_MODEL = "openai/gpt-oss-120b";
