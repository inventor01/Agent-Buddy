import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { useBrand } from "@/lib/use-brand";
import { PLANS, PLAN_ORDER, planOf, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — your name, colour and plan | Agent Buddy" },
      {
        name: "description",
        content:
          "Put your own name, letters and colour on the app, and choose the plan that fits how many helpers you run.",
      },
      { property: "og:title", content: "Settings — your name, colour and plan" },
      {
        property: "og:description",
        content: "Make the app yours and pick your plan in one simple screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const GRAYS = [0.21, 0.32, 0.43, 0.55, 0.68, 0.8];

function SettingsPage() {
  const { brand, ready, save, choosePlan } = useBrand();
  const [form, setForm] = useState(brand);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState<string | null>(null);
  const plan = planOf(brand.plan);
  const canBrand = plan.whiteLabel;

  useEffect(() => {
    if (ready) setForm(brand);
  }, [ready, brand]);

  async function onSave() {
    setBusy(true);
    try {
      await save({
        brandName: form.brandName.trim() || "Agent Buddy",
        brandInitials: (form.brandInitials.trim() || "AB").slice(0, 3),
        brandTagline: form.brandTagline.trim(),
        brandEmoji: form.brandEmoji.trim() || "🤖",
        brandHue: form.brandHue,
        phoneNumber: form.phoneNumber.trim(),
        notifySms: form.notifySms,
        notifyEmail: form.notifyEmail.trim(),
        notifyEmailEnabled: form.notifyEmailEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  async function pick(id: PlanId) {
    setPlanBusy(id);
    try {
      await choosePlan(id);
    } finally {
      setPlanBusy(null);
    }
  }

  const field =
    "mt-1.5 w-full rounded-2xl border border-ink/10 bg-white/70 px-4 py-2.5 text-[15px] outline-none transition-colors focus:border-brand/50";
  const label = "text-[13px] font-medium text-ink/55";

  return (
    <Shell>
      <main className="mx-auto w-full max-w-[720px] pt-14 pb-4">
        <h1 className="font-display text-[32px] font-semibold sm:text-[40px]">Settings</h1>
        <p className="mt-2 text-[15px] text-ink/55">
          Make the app look like yours, and pick the plan that fits.
        </p>

        <section className="glass mt-8 rounded-[28px] p-6 sm:p-7">
          <h2 className="font-display text-[19px] font-semibold">Make it yours</h2>
          <p className="mt-1 text-[14px] text-ink/55">
            Your name and colour show up everywhere, for everyone you share it with.
          </p>

          {!canBrand && (
            <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-[13px] text-ink/70">
              Your {plan.name} plan keeps our name on the app. Choose Pro or Studio below to use
              your own.
            </p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Name</span>
              <input
                value={form.brandName}
                disabled={!canBrand}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Letters on the badge</span>
              <input
                value={form.brandInitials}
                disabled={!canBrand}
                maxLength={3}
                onChange={(e) => setForm({ ...form, brandInitials: e.target.value })}
                className={field}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>One-line description</span>
              <input
                value={form.brandTagline}
                disabled={!canBrand}
                onChange={(e) => setForm({ ...form, brandTagline: e.target.value })}
                className={field}
              />
            </label>
          </div>

          <div className="mt-5">
            <span className={label}>Ink shade</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRAYS.map((gray) => (
                <button
                  key={gray}
                  disabled={!canBrand}
                  onClick={() => setForm({ ...form, brandHue: gray })}
                  aria-label={`Shade ${gray}`}
                  aria-pressed={form.brandHue === gray}
                  style={{ background: `oklch(${gray} 0 0)` }}
                  className={`size-9 rounded-full border border-ink/10 transition-transform disabled:opacity-40 ${
                    form.brandHue === gray ? "scale-110 ring-2 ring-ink/20 ring-offset-2" : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={!canBrand || busy}
              className="lift rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-[13px] text-brand">Saved</span>}
          </div>
        </section>

        <section className="glass mt-6 rounded-[28px] p-6 sm:p-7">
          <h2 className="font-display text-[19px] font-semibold">Notifications</h2>
          <p className="mt-1 text-[14px] text-ink/55">
            Get a buddy's message the moment it runs — by text, email, or both.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Phone number</span>
              <input
                type="tel"
                value={form.phoneNumber}
                placeholder="+1 555 123 4567"
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Email</span>
              <input
                type="email"
                value={form.notifyEmail}
                placeholder="you@example.com"
                onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })}
                className={field}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, notifySms: !form.notifySms })}
              role="switch"
              aria-checked={form.notifySms}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium ${
                form.notifySms
                  ? "border-brand/30 bg-brand-soft text-brand"
                  : "border-ink/10 text-ink/60"
              }`}
            >
              <span
                className={`size-2 rounded-full ${form.notifySms ? "bg-brand" : "bg-ink/25"}`}
              />
              Text me
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, notifyEmailEnabled: !form.notifyEmailEnabled })}
              role="switch"
              aria-checked={form.notifyEmailEnabled}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium ${
                form.notifyEmailEnabled
                  ? "border-brand/30 bg-brand-soft text-brand"
                  : "border-ink/10 text-ink/60"
              }`}
            >
              <span
                className={`size-2 rounded-full ${form.notifyEmailEnabled ? "bg-brand" : "bg-ink/25"}`}
              />
              Email me
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={busy}
              className="lift rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-[13px] text-brand">Saved</span>}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="px-1 font-display text-[19px] font-semibold">Your plan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              const active = plan.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-[24px] p-5 ${active ? "glass-tint" : "glass-soft"}`}
                >
                  <p className="font-display text-[16px] font-semibold">{p.name}</p>
                  <p className="mt-2 font-display text-[28px] font-semibold">
                    ${p.price}
                    <span className="text-[13px] font-normal text-ink/45"> /month</span>
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink/55">{p.blurb}</p>
                  <ul className="mt-3 space-y-1.5">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex gap-2 text-[13px] text-ink/70">
                        <span className="text-brand">·</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => pick(p.id)}
                    disabled={active || planBusy === p.id}
                    className={`mt-4 w-full rounded-full py-2.5 text-[13px] font-semibold ${
                      active
                        ? "bg-brand-soft text-brand"
                        : "bg-brand text-white disabled:opacity-50"
                    }`}
                  >
                    {active ? "Your plan" : planBusy === p.id ? "Switching…" : "Choose"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 px-1 text-[12px] text-ink/40">
            Choosing a plan here doesn't charge a card yet — card payments still need to be turned
            on.
          </p>
        </section>
      </main>
    </Shell>
  );
}
