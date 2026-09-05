import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Runs every enabled buddy whose local hour has just arrived.
 * Called hourly by the scheduler; safe to call by hand for testing.
 */
async function handle(request: Request) {
  const authError = await authenticateCronRequest(request);
  if (authError) return authError;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runBuddy } = await import("@/lib/engine.server");
  const { sendRunNotifications } = await import("@/lib/notify.server");

  const url = new URL(request.url);
  const forcedId = url.searchParams.get("buddy_id");
  const now = new Date();

  const { data: rows, error } = await supabaseAdmin.from("buddies").select("*").eq("enabled", true);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const due = (rows ?? []).filter((row) => {
    if (forcedId) return row.id === forcedId;
    const localHour = new Date(now.getTime() + row.utc_offset_minutes * 60000).getUTCHours();
    if (localHour !== row.run_hour) return false;
    if (!row.last_run_at) return true;
    // Don't repeat within the same 20 hours.
    return now.getTime() - new Date(row.last_run_at).getTime() > 20 * 60 * 60 * 1000;
  });

  const results: Array<{ id: string; name: string; ok: boolean; found: number; error?: string }> =
    [];

  for (const row of due) {
    try {
      const result = await runBuddy({
        name: row.name,
        emoji: row.emoji,
        tagline: row.tagline,
        voice: row.voice,
        kind: row.kind,
        store: row.store,
        blocks: (Array.isArray(row.blocks) ? row.blocks : []) as Array<{
          type: string;
          label: string;
        }>,
      });
      await supabaseAdmin.from("buddy_runs").insert({
        buddy_id: row.id,
        message: result.message,
        items: result.items,
        sources: result.sources,
        trigger: forcedId ? "test" : "schedule",
        ok: result.ok,
      });
      await supabaseAdmin
        .from("buddies")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", row.id);
      void sendRunNotifications(row.owner_token, row.name, result.message);
      results.push({ id: row.id, name: row.name, ok: result.ok, found: result.items.length });
    } catch (err) {
      results.push({
        id: row.id,
        name: row.name,
        ok: false,
        found: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({ ok: true, checked: rows?.length ?? 0, ran: results });
}

export const Route = createFileRoute("/api/public/hooks/run-due-buddies")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
