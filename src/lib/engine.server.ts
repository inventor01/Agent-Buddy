import { streamText } from "ai";
import { z } from "zod";
import { createAiProvider, CHAT_MODEL } from "./ai-gateway.server";
import { couponSourceUrls, fetchSources } from "./sources.server";
import { parseJsonBlock } from "./json-extract";

export interface DealItem {
  [key: string]: string | boolean;
  title: string;
  discount: string;
  code: string;
  details: string;
  verified: boolean;
  source: string;
}

export interface RunResult {
  message: string;
  items: DealItem[];
  sources: string[];
  ok: boolean;
}

export interface BuddySpec {
  name: string;
  emoji: string;
  tagline: string;
  voice: string;
  kind: string;
  store: string | null;
  people?: string | null;
  blocks: Array<{ type: string; label: string }>;
}

const VOICE_HINT: Record<string, string> = {
  friend: "warm and chatty, like a friend texting",
  short: "short and clear, no fluff",
  cheerful: "extra cheerful and encouraging",
  calm: "calm and steady, unhurried",
  pro: "polite and professional",
};

function gateway() {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new Error("AI is not set up yet.");
  return createAiProvider(key);
}

const DealSchema = z.object({
  deals: z.array(
    z.object({
      title: z.string(),
      discount: z.string().default(""),
      code: z.string().default(""),
      details: z.string().default(""),
      verified: z.boolean().default(false),
      source: z.string().default(""),
    }),
  ),
});

/** Read real, currently-listed offers for a store out of live public pages. */
export async function collectDeals(store: string) {
  const urls = couponSourceUrls(store);
  const fetched = await fetchSources(urls);
  const usable = fetched.filter((f) => f.ok && f.text.length > 800);
  const readSources = usable.map((f) => f.url);

  if (usable.length === 0) return { items: [] as DealItem[], sources: readSources };

  const corpus = usable
    .map((f) => `=== SOURCE: ${f.url} ===\n${f.text.slice(0, 14000)}`)
    .join("\n\n");

  const today = new Date().toISOString().slice(0, 10);

  const result = streamText({
    model: gateway()(CHAT_MODEL),
    system: [
      `Today is ${today}.`,
      `You are reading the raw text of live public coupon pages for ${store}.`,
      "Extract only offers that are actually written on these pages. Never invent an offer, a code, a percentage or an expiry.",
      "title: the offer as a shopper would say it. discount: e.g. '20% off', '$10 off', 'Free shipping', or '' if unclear.",
      "code: the promo code exactly as printed; many sites print only the last few characters (e.g. 'W20') - copy what is there; use '' when the offer needs no code.",
      "details: any stated conditions (minimum spend, expiry, new customers only) in plain words, or '' if none are stated.",
      "verified: true only if the page explicitly marks the offer verified or tested.",
      "source: the exact SOURCE url the offer came from.",
      "Return up to 8 of the most useful, distinct offers. Skip navigation, adverts and unrelated stores.",
      'Reply with JSON only, in this exact shape: {"deals":[{"title":"","discount":"","code":"","details":"","verified":false,"source":""}]}',
    ].join(" "),
    prompt: corpus,
  });

  const parsed = DealSchema.safeParse(parseJsonBlock(await result.text));
  if (!parsed.success) return { items: [] as DealItem[], sources: readSources };
  return { items: parsed.data.deals.slice(0, 8) as DealItem[], sources: readSources };
}

/** Write the message the buddy sends, in its own voice, from real findings. */
async function writeMessage(buddy: BuddySpec, facts: string, extra?: string) {
  const result = streamText({
    model: gateway()(CHAT_MODEL),
    system: [
      `You are "${buddy.name}", a personal helper. Your job: ${buddy.tagline}.`,
      `Speak ${VOICE_HINT[buddy.voice] ?? VOICE_HINT["friend"]}.`,
      "Write the one message you send the person right now. Plain words a grandparent understands.",
      "Use only the findings given to you. Never invent a code, price or expiry.",
      "Keep it under 90 words. No markdown, no headings, no bullet characters.",
      extra ??
        "Lead with the best one or two, mention how many others there are. If the findings are empty, say plainly that nothing new turned up today and you'll look again tomorrow.",
    ].join(" "),
    prompt: facts,
  });
  return (await result.text).trim();
}

/** Parse "Name — Month Day" lines from a birthday list. */
function parseBirthdays(people: string) {
  return people
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?)\s*[—–-]\s*([A-Za-z]+)\s+(\d{1,2})/);
      if (!match) return null;
      const [, nameRaw = "", monthRaw = "", dayRaw = ""] = match;
      const month = new Date(`${monthRaw} 1, 2000`).getMonth();
      if (Number.isNaN(month)) return null;
      return { name: nameRaw.trim(), month, day: Number(dayRaw) };
    })
    .filter((p): p is { name: string; month: number; day: number } => p !== null);
}

export async function runBuddy(buddy: BuddySpec): Promise<RunResult> {
  if (buddy.kind === "birthday") {
    const list = parseBirthdays(buddy.people ?? "");
    const now = new Date();
    const todays = list.filter((p) => p.month === now.getMonth() && p.day === now.getDate());
    const facts =
      list.length === 0
        ? "The birthday list is empty. Ask the person to add names and birthdays."
        : todays.length === 0
          ? `Nobody on the list has a birthday today. The list: ${list
              .map((p) => `${p.name} (${p.month + 1}/${p.day})`)
              .join(", ")}.`
          : `Today's birthdays: ${todays.map((p) => p.name).join(", ")}.`;
    const message = await writeMessage(
      buddy,
      facts,
      todays.length === 0
        ? "Say plainly that nobody on the birthday list has a birthday today, and that you'll check again tomorrow. One or two warm sentences."
        : "Write one short, warm happy-birthday text per person, ready to copy into a phone text. Put each on its own line, starting with the person's name. Never mention coupons or offers.",
    );
    return { message, items: [], sources: [], ok: true };
  }

  if (buddy.kind === "coupon" && buddy.store) {
    const { items, sources } = await collectDeals(buddy.store);
    const facts =
      items.length === 0
        ? `No offers could be read for ${buddy.store} today.`
        : `Live offers found for ${buddy.store} today:\n` +
          items
            .map(
              (d, i) =>
                `${i + 1}. ${d.title} | ${d.discount} | code: ${d.code || "none needed"} | ${
                  d.details || "no conditions listed"
                }${d.verified ? " | verified" : ""}`,
            )
            .join("\n");
    const message = await writeMessage(buddy, facts);
    return { message, items, sources, ok: items.length > 0 };
  }

  const message = await writeMessage(
    buddy,
    `This buddy's instructions:\n${buddy.blocks.map((b) => `${b.type}: ${b.label}`).join("\n")}\n\nNo live data source is connected to this buddy yet, so say what you would do and make clear the details are an example.`,
  );
  return { message, items: [], sources: [], ok: true };
}
