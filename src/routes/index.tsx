import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/shell";
import { useAgents } from "@/lib/use-agents";
import { PRESETS, agentFromPreset, uid, type Agent } from "@/lib/agents";
import { buildAgentFromSentence } from "@/lib/ai.functions";
import { createRecognizer, speak } from "@/lib/voice";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Agent Buddy — say it once, your helper does it daily" },
      {
        name: "description",
        content:
          "Type one sentence and Agent Buddy builds a helper that runs on its own: daily store coupons, birthday texts, reminders and more. No code, ever.",
      },
      { property: "og:title", content: "Agent Buddy — say it once, your helper does it daily" },
      {
        property: "og:description",
        content: "One box. One sentence. A helper that goes and does it for you every day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function HomePage() {
  const navigate = useNavigate();
  const { agents, ready, upsert, toggle, remove, runNow: runBuddy } = useAgents();
  const build = useServerFn(buildAgentFromSentence);

  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  const startListening = () => {
    const rec = createRecognizer();
    if (!rec) {
      setNote("This browser can't hear you — you can type it instead.");
      return;
    }
    recRef.current = rec;
    setNote(null);
    setListening(true);
    rec.onresult = (event) => {
      const text = Array.from(event.results as ArrayLike<ArrayLike<{ transcript: string }>>)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setHeard(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const makeIt = async () => {
    if (!heard.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const draft = await build({ data: { sentence: heard } });
      const agent: Agent = {
        id: uid(),
        name: draft.name,
        emoji: draft.emoji,
        tagline: draft.tagline,
        voice: "friend",
        schedule: draft.schedule,
        blocks: [
          { id: uid(), type: "when", label: draft.when },
          { id: uid(), type: "then", label: draft.then },
          { id: uid(), type: "tell", label: draft.tell },
        ],
        runs: [],
        enabled: true,
        createdAt: Date.now(),
      };
      const savedId = await upsert(agent);
      setHeard("");
      navigate({ to: "/builder", search: { id: savedId } });
    } catch (err) {
      setNote(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const setUpPreset = async (preset: (typeof PRESETS)[number]) => {
    setNote(null);
    setBusy(true);
    try {
      const savedId = await upsert(agentFromPreset(preset));
      navigate({ to: "/builder", search: { id: savedId } });
    } catch (err) {
      setNote(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (agent: Agent) => {
    setBusyId(agent.id);
    setNote(null);
    try {
      await runBuddy(agent.id);
      setOpenId(agent.id);
    } catch {
      setNote("I couldn't get through just now — try again in a minute.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteBuddy = async (agent: Agent) => {
    if (confirmId !== agent.id) {
      setConfirmId(agent.id);
      return;
    }
    setConfirmId(null);
    setBusyId(agent.id);
    try {
      await remove(agent.id);
    } catch {
      setNote("I couldn't delete that just now — try again in a minute.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell>
      <main className="mx-auto w-full max-w-[720px]">
        <section className="motion-safe:rise mx-auto mt-11 max-w-[560px] text-center">
          <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-[-.03em] sm:text-[46px]">
            Leave it a note.
            <br />
            It does the errand.
          </h1>
          <p className="mx-auto mt-4 max-w-[400px] text-[15.5px] leading-[1.6] text-ink/60">
            Write it the way you'd write it on the fridge. It goes off, has a look, and pins the
            answer back for you.
          </p>
        </section>

        <section className="motion-safe:rise mt-10">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-[26px]">
            <div className="note w-[250px] bg-brand-soft p-[22px_20px_20px] motion-safe:lg:rotate-[-2.2deg]">
              <p className="text-[10.5px] font-semibold tracking-[.14em] text-ink/45 uppercase">
                Your note
              </p>
              <textarea
                value={heard}
                onChange={(e) => setHeard(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void makeIt();
                  }
                }}
                rows={3}
                aria-label="What should your helper do?"
                placeholder="Send me Kroger's best coupons every morning at 9"
                className="font-hand mt-2 w-full resize-none bg-transparent text-[25px] leading-[1.3] font-semibold text-ink outline-none placeholder:text-ink/40"
              />
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[rgba(60,45,25,.18)] pt-3">
                <button
                  onClick={listening ? stopListening : startListening}
                  aria-pressed={listening}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink/55 transition-colors hover:text-ink"
                >
                  <span className="relative grid size-4 place-items-center" aria-hidden>
                    {listening && (
                      <span className="absolute inset-0 rounded-full bg-brand/40 motion-safe:animate-[mic-ring_1.4s_ease-out_infinite]" />
                    )}
                    <span className="relative size-2.5 rounded-full bg-brand" />
                  </span>
                  {listening ? "Listening…" : "🎙 or say it"}
                </button>
                <button
                  onClick={makeIt}
                  disabled={busy || !heard.trim()}
                  className="rounded-full bg-ink px-[15px] py-[9px] text-[12.5px] font-semibold text-brand-soft transition-opacity disabled:opacity-40"
                >
                  {busy ? "Pinning…" : "Pin it up"}
                </button>
              </div>
            </div>

            <div
              className="hidden w-14 pt-[70px] text-center text-[12px] text-ink/45 lg:block"
              aria-hidden
            >
              <div className="h-px bg-[rgba(60,45,25,.25)]" />
              <span className="my-2 block">it goes</span>
              <div className="h-px bg-[rgba(60,45,25,.25)]" />
            </div>

            <div className="note w-[270px] bg-white p-5 motion-safe:lg:rotate-[1.6deg]">
              <div className="flex items-center gap-2.5 border-b border-ink/10 pb-3">
                <span className="grid size-8 place-items-center bg-canvas" aria-hidden>
                  🛒
                </span>
                <div>
                  <p className="font-display text-[13.5px] font-semibold">Shopping Sam</p>
                  <p className="text-[11px] text-ink/50">pinned this at 9:02 AM</p>
                </div>
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.6]">
                Morning! Three worth your time today:
              </p>
              <ul className="mt-2.5 space-y-1.5">
                <li className="bg-mist px-[11px] py-[9px] text-[12.5px]">
                  <span className="font-semibold">$2 off eggs</span> · code EGG2
                </li>
                <li className="bg-mist px-[11px] py-[9px] text-[12.5px]">
                  <span className="font-semibold">BOGO coffee</span> · in store
                </li>
                <li className="bg-mist px-[11px] py-[9px] text-[12.5px]">
                  <span className="font-semibold">15% off produce</span> · FRESH15
                </li>
              </ul>
              <button
                onClick={() =>
                  speak(
                    "Morning! Three worth your time today: $2 off eggs, code EGG2. BOGO coffee, in store. 15% off produce, code FRESH15.",
                  )
                }
                className="mt-3 text-[11.5px] font-semibold text-brand"
              >
                🔊 Read it to me
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const preset = PRESETS.find((p) => p.name === "Birthday Bells");
                if (preset) void setUpPreset(preset);
              }}
              className="note w-[180px] bg-[oklch(0.9_0.03_150)] p-[18px] text-left motion-safe:lg:rotate-[-1.2deg]"
            >
              <p className="font-hand text-[21px] leading-[1.3] font-semibold">
                Text Mom happy birthday a week early
              </p>
              <p className="mt-2 text-[11.5px] text-ink/65">
                Birthday Bells has this one — every morning at 8.
              </p>
              <span className="mt-3 inline-block rounded-full bg-white/75 px-[11px] py-1.5 text-[11px] font-semibold">
                Running ✓
              </span>
            </button>
          </div>

          {note && (
            <p className="mt-5 rounded-2xl bg-mist px-4 py-3 text-center text-[13px] text-ink/70">
              {note}
            </p>
          )}

          <div className="mt-9 flex flex-wrap justify-center gap-2">
            {PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.name}
                onClick={() => setUpPreset(preset)}
                disabled={busy}
                className="rounded-full border border-ink/12 bg-white/70 px-[13px] py-[7px] text-[12.5px] text-ink/70 transition-colors hover:text-ink disabled:opacity-50"
              >
                <span className="mr-1.5" aria-hidden>
                  {preset.emoji}
                </span>
                {preset.name}
              </button>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-[520px] text-center text-[13px] leading-[1.6] text-ink/52">
            Every note shows you three plain lines before it starts — when it happens, what it does,
            and how it tells you. Take a note down any time.
          </p>
        </section>

        {ready && agents.length > 0 && (
          <section className="mt-16">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="font-display text-[17px] font-semibold">Your helpers</h2>
              <span className="text-[13px] text-ink/40">
                {agents.filter((a) => a.enabled).length} running
              </span>
            </div>

            <div className="space-y-3">
              {agents.map((agent) => (
                <article key={agent.id} className="glass rounded-[24px] p-4 sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-xl">
                      {agent.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[16px] font-semibold">{agent.name}</p>
                      <p className="mt-0.5 truncate text-[13px] text-ink/55">{agent.tagline}</p>
                      <p className="mt-1 text-[12px] text-ink/40">
                        {agent.enabled ? agent.schedule : "Paused"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(agent.id)}
                      role="switch"
                      aria-checked={agent.enabled}
                      aria-label={`Turn ${agent.name} ${agent.enabled ? "off" : "on"}`}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        agent.enabled ? "bg-brand" : "bg-ink/15"
                      }`}
                    >
                      <span
                        className={`size-4.5 rounded-full bg-white shadow transition-transform ${
                          agent.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => runNow(agent)}
                      disabled={busyId === agent.id}
                      className="rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      {busyId === agent.id ? "Working…" : "Run now"}
                    </button>
                    <Link
                      to="/builder"
                      search={{ id: agent.id }}
                      className="rounded-full border border-ink/10 px-4 py-2 text-[13px] font-medium text-ink/70 hover:bg-mist"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setOpenId(openId === agent.id ? null : agent.id)}
                      className="rounded-full px-3 py-2 text-[13px] text-ink/45 hover:text-ink"
                    >
                      {openId === agent.id ? "Hide messages" : `Messages · ${agent.runs.length}`}
                    </button>
                    <button
                      onClick={() => deleteBuddy(agent)}
                      disabled={busyId === agent.id}
                      aria-label={
                        confirmId === agent.id
                          ? `Really delete ${agent.name}?`
                          : `Delete ${agent.name}`
                      }
                      className={`ml-auto rounded-full px-3 py-2 text-[13px] font-medium disabled:opacity-50 ${
                        confirmId === agent.id
                          ? "bg-destructive text-white"
                          : "text-ink/40 hover:text-destructive"
                      }`}
                    >
                      {confirmId === agent.id ? "Sure?" : "Delete"}
                    </button>
                  </div>

                  {openId === agent.id && (
                    <div className="mt-4 space-y-2.5">
                      {agent.runs.length === 0 && (
                        <p className="text-[13px] text-ink/40">Nothing yet — tap “Run now”.</p>
                      )}
                      {agent.runs.map((run) => (
                        <div key={run.id} className="glass-tint rounded-2xl rounded-tl-md p-4">
                          <p className="text-[14px] leading-relaxed text-ink/85">{run.body}</p>
                          {run.items && run.items.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {run.items.map((deal, i) => (
                                <li key={i} className="rounded-xl bg-white/70 px-3 py-2">
                                  <p className="text-[13px] font-semibold">{deal.title}</p>
                                  <p className="text-[12px] text-ink/55">
                                    {[
                                      deal.discount,
                                      deal.code ? `code ${deal.code}` : "",
                                      deal.details,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                  {deal.source && (
                                    <a
                                      href={deal.source}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-brand hover:underline"
                                    >
                                      where I found it
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="text-[11px] text-ink/40">
                              {new Date(run.at).toLocaleString()}
                            </span>
                            <button
                              onClick={() => speak(run.body)}
                              className="text-[11px] font-semibold text-brand"
                            >
                              Read aloud
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {ready && agents.length === 0 && (
          <p className="mt-16 text-center text-[13px] text-ink/40">
            Your helpers will show up here once you make your first one.
          </p>
        )}
      </main>
    </Shell>
  );
}

function friendly(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message.toLowerCase().includes("plan")) return message;
  return "I couldn't build that one just now. Try again in a moment.";
}
