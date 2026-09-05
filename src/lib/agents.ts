export type BlockType = "when" | "then" | "tell";

export interface Block {
  id: string;
  type: BlockType;
  label: string;
}

export type VoiceStyle = "friend" | "short" | "cheerful" | "calm" | "pro";

export interface Deal {
  title: string;
  discount: string;
  code: string;
  details: string;
  verified: boolean;
  source: string;
}

export interface AgentRun {
  id: string;
  at: number;
  body: string;
  items?: Deal[];
  sources?: string[];
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  voice: VoiceStyle;
  schedule: string;
  blocks: Block[];
  runs: AgentRun[];
  enabled: boolean;
  createdAt: number;
  /** A shop to watch for real coupons, e.g. "Kroger". */
  store?: string | null;
  kind?: string | undefined;
  /** Birthday list, one per line: "Name — Month Day", e.g. "Mom — March 3". */
  people?: string | null;
}

export const STORAGE_KEY = "agent-buddy-v1";

export const VOICE_LABEL: Record<VoiceStyle, string> = {
  friend: "Talk like a friend",
  short: "Short and clear",
  cheerful: "Extra cheerful",
  calm: "Calm and steady",
  pro: "Professional",
};

export const BLOCK_LABEL: Record<BlockType, string> = {
  when: "When this happens",
  then: "Then do this",
  tell: "Tell me like this",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export interface Preset {
  name: string;
  emoji: string;
  tagline: string;
  badge: "Active" | "New" | "Paused";
  schedule: string;
  store?: string;
  kind?: string;
  people?: string;
  blocks: Array<{ type: BlockType; label: string }>;
}

export const PRESETS: Preset[] = [
  {
    name: "Shopping Sam",
    emoji: "🛒",
    tagline: "Sends you today's real Kroger coupons, every morning at 9.",
    badge: "Active",
    schedule: "Every morning · 9:00 AM",
    store: "Kroger",
    blocks: [
      { type: "when", label: "It's 9:00 AM, every day" },
      { type: "then", label: "Check my favorite stores for new coupons" },
      { type: "tell", label: "Send me the best three, with the codes" },
    ],
  },
  {
    name: "Storefront Sid",
    emoji: "🏬",
    tagline: "Builds a complete, ready-to-sell online store from a prompt.",
    badge: "New",
    schedule: "When I ask",
    blocks: [
      { type: "when", label: "I describe the shop I want" },
      { type: "then", label: "Plan the store: name, products, prices, pages" },
      { type: "tell", label: "Walk me through it step by step" },
    ],
  },
  {
    name: "Birthday Bells",
    emoji: "🎂",
    tagline: "Checks your list every morning and writes a happy-birthday text for whoever's day it is.",
    badge: "New",
    schedule: "Every morning · 8:00 AM",
    kind: "birthday",
    people: "Mom — March 3\nAlex — July 22\nSam — November 10",
    blocks: [
      { type: "when", label: "It's 8:00 AM, every day" },
      { type: "then", label: "Check my birthday list for today's birthdays" },
      { type: "tell", label: "Send me a ready-to-post happy birthday text for each person" },
    ],
  },
  {
    name: "Med Mate",
    emoji: "💊",
    tagline: "A friendly reminder for every dose, at the right time.",
    badge: "Paused",
    schedule: "Every day · 8:00 AM",
    blocks: [
      { type: "when", label: "It's time for my medicine" },
      { type: "then", label: "Check I haven't already ticked it off" },
      { type: "tell", label: "Give me a gentle nudge" },
    ],
  },
  {
    name: "Bill Boss",
    emoji: "💰",
    tagline: "Tracks every bill and warns you before the due date.",
    badge: "Active",
    schedule: "Every Friday · 6:00 PM",
    blocks: [
      { type: "when", label: "A bill is due in three days" },
      { type: "then", label: "Add up what's owed this week" },
      { type: "tell", label: "Tell me the total and what's next" },
    ],
  },
];

export function agentFromPreset(preset: Preset): Agent {
  return {
    id: uid(),
    name: preset.name,
    emoji: preset.emoji,
    tagline: preset.tagline,
    voice: "friend",
    schedule: preset.schedule,
    store: preset.store ?? null,
    kind: preset.kind,
    people: preset.people ?? null,
    blocks: preset.blocks.map((b) => ({ id: uid(), ...b })),
    runs: [],
    enabled: true,
    createdAt: Date.now(),
  };
}

export function emptyAgent(): Agent {
  return {
    id: uid(),
    name: "My Buddy",
    emoji: "🤖",
    tagline: "A helper I made myself.",
    voice: "friend",
    schedule: "When I ask",
    blocks: [
      { id: uid(), type: "when", label: "It's Tuesday, 9:00 AM" },
      { id: uid(), type: "then", label: "Send me a nudge" },
      { id: uid(), type: "tell", label: '"Trash day! 🗑️ See you in the yard."' },
    ],
    runs: [],
    enabled: true,
    createdAt: Date.now(),
  };
}

export function loadAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Agent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAgents(agents: Agent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}
