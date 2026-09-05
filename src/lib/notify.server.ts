/**
 * SMS via Twilio and email via Resend. Both are env-gated: with no key set, the
 * matching send is skipped (logged, never thrown) so runs still work with either,
 * both, or neither delivery channel configured.
 */

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!sid || !authToken || !from) {
    console.warn("[notify] Twilio not configured — skipping SMS send.");
    return false;
  }
  try {
    const auth = Buffer.from(`${sid}:${authToken}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      console.error("[notify] Twilio send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] Twilio send threw", err);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!key || !from) {
    console.warn("[notify] Resend not configured — skipping email send.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error("[notify] Resend send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] Resend send threw", err);
    return false;
  }
}

/** Look up a workspace's notification prefs and deliver a buddy's run, if enabled. Never throws. */
export async function sendRunNotifications(ownerToken: string, buddyName: string, message: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The generated Database types won't know about these columns until
    // 0002_add_notification_prefs.sql has been run and types regenerated.
    const { data: ws } = (await supabaseAdmin
      .from("workspaces")
      .select("phone_number, notify_sms, notify_email, notify_email_enabled")
      .eq("owner_token", ownerToken)
      .maybeSingle()) as {
      data: {
        phone_number: string | null;
        notify_sms: boolean;
        notify_email: string | null;
        notify_email_enabled: boolean;
      } | null;
    };
    if (!ws) return;

    const tasks: Array<Promise<boolean>> = [];
    if (ws.notify_sms && ws.phone_number) {
      tasks.push(sendSms(ws.phone_number, `${buddyName}: ${message}`));
    }
    if (ws.notify_email_enabled && ws.notify_email) {
      tasks.push(sendEmail(ws.notify_email, `${buddyName} just ran`, message));
    }
    if (tasks.length > 0) await Promise.allSettled(tasks);
  } catch (err) {
    console.error("[notify] sendRunNotifications failed", err);
  }
}
