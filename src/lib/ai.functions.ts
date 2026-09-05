import { createServerFn } from "@tanstack/react-start";
import { streamText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, CHAT_MODEL } from "./ai-gateway.server";

const BuildInput = z.object({ sentence: z.string().min(1) });

const BuildOutput = z.object({
  name: z.string(),
  emoji: z.string(),
  tagline: z.string(),
  schedule: z.string(),
  when: z.string(),
  then: z.string(),
  tell: z.string(),
});

function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not set up yet.");
  return createLovableAiGatewayProvider(key);
}

export const buildAgentFromSentence = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BuildInput.parse(input))
  .handler(async ({ data }) => {
    const result = streamText({
      model: gateway()(CHAT_MODEL),
      system: [
        "You turn one plain sentence into a friendly little helper ('buddy').",
        "Write everything in warm, everyday words a grandparent would understand. No jargon.",
        "name: a two-word alliterative buddy name, e.g. 'Coupon Cathy'.",
        "emoji: one emoji that fits.",
        "tagline: one short sentence about what it does.",
        "schedule: plain words like 'Every Tuesday · 9:00 AM' or 'When I ask'.",
        "when/then/tell: one short plain-language line each.",
      ].join(" "),
      prompt: data.sentence,
      output: Output.object({ schema: BuildOutput }),
    });
    return await result.output;
  });

const RunInput = z.object({
  name: z.string(),
  tagline: z.string(),
  voice: z.string(),
  blocks: z.array(z.object({ type: z.string(), label: z.string() })),
});

export const runAgentOnce = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data }) => {
    const result = streamText({
      model: gateway()(CHAT_MODEL),
      system: [
        `You are "${data.name}", a helpful little buddy: ${data.tagline}.`,
        `Speak in this style: ${data.voice}.`,
        "Write the single message you would send the person right now, as if you just did the work.",
        "Be concrete and useful (names, amounts, times, codes where it fits), 2-4 short sentences, plain words, no headings, no markdown.",
        "If you are inventing example results, say so lightly at the end in a few words.",
      ].join(" "),
      prompt: data.blocks.map((b) => `${b.type}: ${b.label}`).join("\n"),
    });
    return { message: (await result.text).trim() };
  });
