import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "./agents";
import { useAuth } from "./use-auth";
import { claimOwnerToken } from "./identity.functions";
import {
  listBuddies,
  saveBuddy,
  setBuddyEnabled,
  deleteBuddy,
  runBuddyNow,
  type BuddyRow,
} from "./buddies.functions";

const TOKEN_KEY = "agent-buddy-owner";

export function ownerToken() {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = `own_${crypto.randomUUID().replace(/-/g, "")}`;
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

/** Turn "Every morning · 9:00 AM" into the hour of the day (0-23). */
export function parseRunHour(schedule: string) {
  const match = schedule.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return 9;
  let hour = Number(match[1]) % 12;
  if (match[3]?.toLowerCase() === "pm") hour += 12;
  return hour;
}

function toAgent(row: BuddyRow): Agent {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    tagline: row.tagline,
    voice: row.voice as Agent["voice"],
    schedule: row.scheduleLabel,
    blocks: row.blocks,
    enabled: row.enabled,
    createdAt: Date.now(),
    store: row.store,
    kind: row.kind,
    people: row.people,
    runs: row.runs.map((r) => ({
      id: r.id,
      at: new Date(r.createdAt).getTime(),
      body: r.message,
      items: r.items,
      sources: r.sources,
    })),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useAgents() {
  const { user, ready: authReady } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ready, setReady] = useState(false);
  const token = useRef("");

  const refresh = useCallback(async () => {
    if (!token.current) return;
    try {
      const rows = await listBuddies({ data: { ownerToken: token.current } });
      setAgents(rows.map(toAgent));
    } catch {
      /* keep whatever we have */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const nextToken = user?.id ?? ownerToken();
    if (user?.id && token.current && token.current !== nextToken) {
      // Just signed in — fold the anonymous browser's buddies into the account.
      void claimOwnerToken({ data: { fromToken: token.current, toToken: nextToken } }).catch(
        () => {},
      );
    }
    token.current = nextToken;
    void refresh();
  }, [authReady, user?.id, refresh]);

  const upsert = useCallback(
    async (agent: Agent) => {
      const store = agent.store ?? null;
      const { id } = await saveBuddy({
        data: {
          ownerToken: token.current || ownerToken(),
          id: UUID.test(agent.id) ? agent.id : null,
          name: agent.name,
          emoji: agent.emoji,
          tagline: agent.tagline,
          voice: agent.voice,
          kind: store ? "coupon" : (agent.kind ?? "simple"),
          store,
          people: agent.people ?? null,
          scheduleLabel: agent.schedule,
          runHour: parseRunHour(agent.schedule),
          utcOffsetMinutes: -new Date().getTimezoneOffset(),
          blocks: agent.blocks,
        },
      });
      await refresh();
      return id;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setAgents((prev) => prev.filter((a) => a.id !== id));
      await deleteBuddy({ data: { ownerToken: token.current || ownerToken(), id } });
      await refresh();
    },
    [refresh],
  );

  const toggle = useCallback(async (id: string) => {
    let next = true;
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        next = !a.enabled;
        return { ...a, enabled: next };
      }),
    );
    await setBuddyEnabled({
      data: { ownerToken: token.current || ownerToken(), id, enabled: next },
    });
  }, []);

  const runNow = useCallback(
    async (id: string) => {
      const result = await runBuddyNow({
        data: { ownerToken: token.current || ownerToken(), id },
      });
      await refresh();
      return result;
    },
    [refresh],
  );

  return { agents, ready, upsert, remove, toggle, refresh, runNow };
}
