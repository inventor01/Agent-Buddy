import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Groq: free tier, OpenAI-compatible endpoint, no credit card. console.groq.com */
export function createAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export const CHAT_MODEL = "llama-3.3-70b-versatile";
