import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface Workspace {
  brandName: string;
  brandInitials: string;
  brandTagline: string;
  brandEmoji: string;
  brandHue: number;
  plan: string;
  phoneNumber: string;
  notifySms: boolean;
  notifyEmail: string;
  notifyEmailEnabled: boolean;
}

export const DEFAULT_WORKSPACE: Workspace = {
  brandName: "Agent Buddy",
  brandInitials: "AB",
  brandTagline: "Drag-and-drop agents",
  brandEmoji: "🤖",
  brandHue: 199,
  plan: "starter",
  phoneNumber: "",
  notifySms: false,
  notifyEmail: "",
  notifyEmailEnabled: false,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function toWorkspace(row: any): Workspace {
  return {
    brandName: row.brand_name,
    brandInitials: row.brand_initials,
    brandTagline: row.brand_tagline,
    brandEmoji: row.brand_emoji,
    brandHue: row.brand_hue,
    plan: row.plan,
    phoneNumber: row.phone_number ?? "",
    notifySms: row.notify_sms ?? false,
    notifyEmail: row.notify_email ?? "",
    notifyEmailEnabled: row.notify_email_enabled ?? false,
  };
}

export const getWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ ownerToken: z.string().min(8) }).parse(input))
  .handler(async ({ data }): Promise<Workspace> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("owner_token", data.ownerToken)
      .maybeSingle();
    if (!row) return DEFAULT_WORKSPACE;
    return toWorkspace(row);
  });

export const saveWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        ownerToken: z.string().min(8),
        brandName: z.string().min(1).max(40),
        brandInitials: z.string().min(1).max(3),
        brandTagline: z.string().max(60),
        brandEmoji: z.string().min(1).max(8),
        brandHue: z.number().int().min(0).max(360),
        plan: z.enum(["starter", "pro", "studio"]).optional(),
        phoneNumber: z.string().max(20).optional().default(""),
        notifySms: z.boolean().optional().default(false),
        notifyEmail: z.string().max(120).optional().default(""),
        notifyEmailEnabled: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<Workspace> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const values = {
      owner_token: data.ownerToken,
      brand_name: data.brandName,
      brand_initials: data.brandInitials.toUpperCase(),
      brand_tagline: data.brandTagline,
      brand_emoji: data.brandEmoji,
      brand_hue: data.brandHue,
      phone_number: data.phoneNumber || null,
      notify_sms: data.notifySms,
      notify_email: data.notifyEmail || null,
      notify_email_enabled: data.notifyEmailEnabled,
      updated_at: new Date().toISOString(),
      ...(data.plan ? { plan: data.plan } : {}),
    };
    const { data: row, error } = await supabaseAdmin
      .from("workspaces")
      // The generated Database types won't know about the notification columns
      // until 0002_add_notification_prefs.sql has been run and types regenerated.
      .upsert(values as any, { onConflict: "owner_token" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toWorkspace(row);
  });

export const setPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ ownerToken: z.string().min(8), plan: z.enum(["starter", "pro", "studio"]) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<Workspace> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("workspaces")
      .upsert(
        { owner_token: data.ownerToken, plan: data.plan, updated_at: new Date().toISOString() },
        { onConflict: "owner_token" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toWorkspace(row);
  });
