import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ClaimSchema = z.object({ fromToken: z.string().min(8), toToken: z.string().min(8) });

/**
 * Called once, right after a browser signs in for the first time: moves any
 * buddies/workspace created anonymously (keyed by the random local token) onto
 * the signed-in user's id, so their data follows them across devices from then on.
 */
export const claimOwnerToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClaimSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.fromToken === data.toToken) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("buddies")
      .update({ owner_token: data.toToken })
      .eq("owner_token", data.fromToken);

    // workspaces.owner_token is a primary key — only move the anonymous row over
    // if the account doesn't already have one, or the update would collide.
    const { data: existing } = await supabaseAdmin
      .from("workspaces")
      .select("owner_token")
      .eq("owner_token", data.toToken)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin
        .from("workspaces")
        .update({ owner_token: data.toToken })
        .eq("owner_token", data.fromToken);
    }

    return { ok: true };
  });
