import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DealItem } from "./engine.server";

const BlockSchema = z.object({
  id: z.string(),
  type: z.enum(["when", "then", "tell"]),
  label: z.string(),
});

const OwnerSchema = z.object({ ownerToken: z.string().min(8) });

const SaveSchema = z.object({
  ownerToken: z.string().min(8),
  id: z.string().uuid().nullable(),
  name: z.string().min(1),
  emoji: z.string().min(1),
  tagline: z.string(),
  voice: z.string(),
  kind: z.string(),
  store: z.string().nullable(),
  people: z.string().nullable(),
  scheduleLabel: z.string(),
  runHour: z.number().int().min(0).max(23),
  utcOffsetMinutes: z.number().int().min(-840).max(840),
  blocks: z.array(BlockSchema),
});

export interface BuddyRow {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  voice: string;
  kind: string;
  store: string | null;
  people: string | null;
  scheduleLabel: string;
  runHour: number;
  utcOffsetMinutes: number;
  enabled: boolean;
  lastRunAt: string | null;
  blocks: Array<{ id: string; type: "when" | "then" | "tell"; label: string }>;
  runs: Array<{
    id: string;
    message: string;
    items: DealItem[];
    sources: string[];
    trigger: string;
    createdAt: string;
  }>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toBuddy(row: any, runs: any[]): BuddyRow {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    tagline: row.tagline,
    voice: row.voice,
    kind: row.kind,
    store: row.store,
    people: row.people ?? null,
    scheduleLabel: row.schedule_label,
    runHour: row.run_hour,
    utcOffsetMinutes: row.utc_offset_minutes,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    runs: runs
      .filter((r) => r.buddy_id === row.id)
      .map((r) => ({
        id: r.id,
        message: r.message,
        items: (Array.isArray(r.items) ? r.items : []) as DealItem[],
        sources: Array.isArray(r.sources) ? r.sources : [],
        trigger: r.trigger,
        createdAt: r.created_at,
      })),
  };
}

export const listBuddies = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => OwnerSchema.parse(input))
  .handler(async ({ data }): Promise<BuddyRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("buddies")
      .select("*")
      .eq("owner_token", data.ownerToken)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    let runs: any[] = [];
    if (ids.length > 0) {
      const { data: runRows, error: runError } = await supabaseAdmin
        .from("buddy_runs")
        .select("*")
        .in("buddy_id", ids)
        .order("created_at", { ascending: false })
        .limit(100);
      if (runError) throw new Error(runError.message);
      runs = runRows ?? [];
    }
    return (rows ?? []).map((row) => toBuddy(row, runs as any[]));
  });

export const saveBuddy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const values = {
      owner_token: data.ownerToken,
      name: data.name,
      emoji: data.emoji,
      tagline: data.tagline,
      voice: data.voice,
      kind: data.kind,
      store: data.store,
      people: data.people,
      schedule_label: data.scheduleLabel,
      run_hour: data.runHour,
      utc_offset_minutes: data.utcOffsetMinutes,
      blocks: data.blocks,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("buddies")
        .update(values)
        .eq("id", data.id)
        .eq("owner_token", data.ownerToken);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { planOf } = await import("./plans");
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("plan")
      .eq("owner_token", data.ownerToken)
      .maybeSingle();
    const plan = planOf(ws?.plan);
    const { count } = await supabaseAdmin
      .from("buddies")
      .select("id", { count: "exact", head: true })
      .eq("owner_token", data.ownerToken);
    if ((count ?? 0) >= plan.buddyLimit) {
      throw new Error(
        `Your ${plan.name} plan holds ${plan.buddyLimit} buddies. Pick a bigger plan to add more.`,
      );
    }

    const { data: row, error } = await supabaseAdmin
      .from("buddies")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setBuddyEnabled = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ ownerToken: z.string().min(8), id: z.string().uuid(), enabled: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("buddies")
      .update({ enabled: data.enabled })
      .eq("id", data.id)
      .eq("owner_token", data.ownerToken);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBuddy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ ownerToken: z.string().min(8), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("buddies")
      .delete()
      .eq("id", data.id)
      .eq("owner_token", data.ownerToken);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runBuddyNow = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ ownerToken: z.string().min(8), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runBuddy } = await import("./engine.server");
    const { data: row, error } = await supabaseAdmin
      .from("buddies")
      .select("*")
      .eq("id", data.id)
      .eq("owner_token", data.ownerToken)
      .single();
    if (error || !row) throw new Error(error?.message ?? "That buddy could not be found.");

    const result = await runBuddy({
      name: row.name,
      emoji: row.emoji,
      tagline: row.tagline,
      voice: row.voice,
      kind: row.kind,
      store: row.store,
      people: row.people ?? null,
      blocks: (Array.isArray(row.blocks) ? row.blocks : []) as Array<{
        type: string;
        label: string;
      }>,
    });

    const { data: runRow, error: insertError } = await supabaseAdmin
      .from("buddy_runs")
      .insert({
        buddy_id: row.id,
        message: result.message,
        items: result.items,
        sources: result.sources,
        trigger: "manual",
        ok: result.ok,
      })
      .select("*")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("buddies")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", row.id);

    const { sendRunNotifications } = await import("./notify.server");
    void sendRunNotifications(data.ownerToken, row.name, result.message);

    return {
      id: runRow.id,
      message: runRow.message,
      items: result.items,
      sources: result.sources,
      createdAt: runRow.created_at,
    };
  });
