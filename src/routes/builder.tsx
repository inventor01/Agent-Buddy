import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/shell";
import { useAgents } from "@/lib/use-agents";
import {
  BLOCK_LABEL,
  VOICE_LABEL,
  emptyAgent,
  uid,
  type Agent,
  type Block,
  type BlockType,
  type VoiceStyle,
} from "@/lib/agents";
import { runAgentOnce } from "@/lib/ai.functions";
import { speak } from "@/lib/voice";

export const Route = createFileRoute("/builder")({
  validateSearch: z.object({ id: z.string().optional() }),
  component: BuilderPage,
  head: () => ({
    meta: [
      { title: "Set up your helper · Agent Buddy" },
      {
        name: "description",
        content:
          "Three plain steps: when it runs, what it does, and how it talks to you. Change any line in your own words.",
      },
      { property: "og:title", content: "Set up your helper · Agent Buddy" },
      {
        property: "og:description",
        content: "When it runs, what it does, how it talks — that's the whole setup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SortableBlock({
  block,
  index,
  onChange,
  onRemove,
}: {
  block: Block;
  index: number;
  onChange: (label: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`glass-soft rounded-[22px] p-4 ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] font-medium text-ink/45">
          <span className="grid size-5 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
            {index + 1}
          </span>
          {BLOCK_LABEL[block.type]}
        </p>
        <div className="flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            aria-label={`Move ${BLOCK_LABEL[block.type]} block`}
            className="cursor-grab rounded-lg px-2 py-1 text-[13px] text-ink/35 hover:bg-mist hover:text-ink active:cursor-grabbing"
          >
            ⠿
          </button>
          <button
            onClick={onRemove}
            aria-label={`Remove ${BLOCK_LABEL[block.type]} block`}
            className="rounded-lg px-2 py-1 text-[13px] text-ink/35 hover:bg-mist hover:text-ink"
          >
            ✕
          </button>
        </div>
      </div>
      <input
        value={block.label}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-transparent font-display text-[17px] font-medium outline-none placeholder:text-ink/30"
        placeholder="Say it in your own words…"
      />
    </div>
  );
}

function BuilderPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { agents, ready, upsert } = useAgents();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAgent = useServerFn(runAgentOnce);

  useEffect(() => {
    if (!ready || agent) return;
    const found = id ? agents.find((a) => a.id === id) : undefined;
    setAgent(found ?? emptyAgent());
  }, [ready, id, agents, agent]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const blockIds = useMemo(() => agent?.blocks.map((b) => b.id) ?? [], [agent]);

  if (!agent) {
    return (
      <Shell>
        <p className="mt-24 text-center text-[14px] text-ink/45">Getting your helper…</p>
      </Shell>
    );
  }

  const patch = (next: Partial<Agent>) => setAgent({ ...agent, ...next });

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = agent.blocks.findIndex((b) => b.id === active.id);
    const newIndex = agent.blocks.findIndex((b) => b.id === over.id);
    patch({ blocks: arrayMove(agent.blocks, oldIndex, newIndex) });
  };

  const addBlock = (type: BlockType) =>
    patch({ blocks: [...agent.blocks, { id: uid(), type, label: "" }] });

  const tryIt = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await runAgent({
        data: {
          name: agent.name,
          tagline: agent.tagline,
          voice: VOICE_LABEL[agent.voice],
          blocks: agent.blocks.map((b) => ({ type: b.type, label: b.label })),
        },
      });
      setPreview(result.message);
    } catch {
      setError("Your helper couldn't answer just now. Give it another go in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await upsert(agent);
      navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes("plan")
          ? err.message
          : "I couldn't save that just now. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 w-full rounded-2xl border border-ink/10 bg-white/70 px-4 py-2.5 text-[15px] outline-none transition-colors focus:border-brand/50";
  const label = "text-[13px] font-medium text-ink/55";

  return (
    <Shell>
      <main className="mx-auto w-full max-w-[760px] pt-14 pb-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-[13px] text-ink/45 hover:text-ink"
        >
          ← All helpers
        </button>

        <div className="mt-4 flex items-center gap-4">
          <input
            value={agent.emoji}
            onChange={(e) => patch({ emoji: e.target.value.slice(0, 2) })}
            aria-label="Helper face"
            className="glass-soft size-14 rounded-2xl text-center text-2xl outline-none"
          />
          <input
            value={agent.name}
            onChange={(e) => patch({ name: e.target.value })}
            aria-label="Helper name"
            className="w-full bg-transparent font-display text-[30px] font-semibold outline-none sm:text-[38px]"
          />
        </div>

        <section className="glass mt-6 rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[17px] font-semibold">How it works</h2>
            <span className="text-[12px] text-ink/40">drag ⠿ to reorder</span>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <div className="mt-4 space-y-2.5">
                {agent.blocks.map((block, i) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    index={i}
                    onChange={(label) =>
                      patch({
                        blocks: agent.blocks.map((b) => (b.id === block.id ? { ...b, label } : b)),
                      })
                    }
                    onRemove={() => patch({ blocks: agent.blocks.filter((b) => b.id !== block.id) })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["when", "then", "tell"] as BlockType[]).map((type) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="rounded-full border border-ink/10 px-4 py-2 text-[13px] font-medium text-ink/60 hover:bg-mist hover:text-ink"
              >
                + {BLOCK_LABEL[type]}
              </button>
            ))}
          </div>
        </section>

        <section className="glass mt-5 rounded-[28px] p-5 sm:p-6">
          <h2 className="font-display text-[17px] font-semibold">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={label}>What it does</span>
              <input
                value={agent.tagline}
                onChange={(e) => patch({ tagline: e.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>When it runs</span>
              <input
                value={agent.schedule}
                onChange={(e) => patch({ schedule: e.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Shop to watch (for real coupons)</span>
              <input
                value={agent.store ?? ""}
                placeholder="Kroger — leave empty if it's not a coupon helper"
                onChange={(e) => patch({ store: e.target.value })}
                className={field}
              />
            </label>
            {agent.kind === "birthday" && (
              <label className="block sm:col-span-2">
                <span className={label}>Birthday list — one per line</span>
                <textarea
                  value={agent.people ?? ""}
                  rows={4}
                  placeholder={"Mom — March 3\nAlex — July 22"}
                  onChange={(e) => patch({ people: e.target.value })}
                  className={`${field} resize-none`}
                />
                <span className="mt-1 block text-[12px] text-ink/40">
                  Name — Month Day. They'll get a birthday text on their day.
                </span>
              </label>
            )}
          </div>

          <fieldset className="mt-5">
            <legend className={label}>How it talks</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(VOICE_LABEL) as VoiceStyle[]).map((voice) => (
                <button
                  key={voice}
                  onClick={() => patch({ voice })}
                  aria-pressed={agent.voice === voice}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                    agent.voice === voice
                      ? "bg-brand text-white"
                      : "border border-ink/10 text-ink/60 hover:bg-mist"
                  }`}
                >
                  {VOICE_LABEL[voice]}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="glass mt-5 rounded-[28px] p-5 sm:p-6">
          <h2 className="font-display text-[17px] font-semibold">Preview</h2>
          <div className="glass-tint mt-3 rounded-2xl rounded-tl-md p-4">
            <p className="text-[14px] leading-relaxed text-ink/85">
              {busy
                ? "Thinking…"
                : preview || "Tap “Try it” and you'll see exactly what it would send you."}
            </p>
          </div>
          {error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={tryIt}
              disabled={busy}
              className="rounded-full border border-ink/10 px-5 py-2.5 text-[14px] font-medium text-ink/70 hover:bg-mist disabled:opacity-50"
            >
              Try it
            </button>
            <button
              onClick={() => preview && speak(preview)}
              className="rounded-full border border-ink/10 px-5 py-2.5 text-[14px] font-medium text-ink/70 hover:bg-mist"
            >
              Read aloud
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="lift ml-auto rounded-full bg-brand px-6 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </section>
      </main>
    </Shell>
  );
}
