/**
 * Pull the first JSON object out of a model reply, tolerating prose or a
 * ```json fence around it. Used instead of provider "structured output" /
 * response_format modes, which some OpenAI-compatible providers (e.g. Groq's
 * gpt-oss models) advertise but don't actually enforce.
 */
export function parseJsonBlock(raw: string): unknown {
  const cleaned = raw
    .replace(/```json/gi, "```")
    .split("```")
    .join("\n");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
