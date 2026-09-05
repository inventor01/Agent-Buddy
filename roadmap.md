# Agent Buddy — roadmap

## Done
- Design system (Kinetic glass athletic: ink background, cyan brand, rose accent, Archivo/Space Grotesk)
- Home: voice panel + builder preview + 3-step journey + preset buddies + My Buddies strip
- Drag-and-drop block builder (dnd-kit) with live preview
- Voice setup (Web Speech API: speech-to-text + text-to-speech)
- White-label branding per agent (name, tagline, voice style, emoji)
- AI: plain sentence -> agent blocks, and agent run simulation (Lovable AI)
- Saved agents in local storage, on/off toggle, chat log per agent

## Open
- Real integrations (store coupon feeds, Shopify store creation) once accounts are connected
- Scheduling/backend runs (needs Cloud)

## QA verified (Sep 5 2026)
- Voice/typed sentence -> AI builds buddy: works
- Preset "Set it up" -> Builder prefilled: works
- Builder drag/reorder, edit fields, Try it, Save: works
- My Buddies: Run now logs a real AI message, toggle/edit/delete/chat: works
- No console or page errors; mobile layout OK
- Team + QA prompts: /mnt/documents/agent-buddy-team-prompts.md

## Real backend (done)
- Cloud database: `buddies` + `buddy_runs` (service-role only, RLS on, all access via server functions with an owner token).
- `src/lib/sources.server.ts` fetches live public coupon pages (kroger.com itself blocks readers; CouponFollow + Coupons.com answer).
- `src/lib/engine.server.ts` extracts real offers with AI (JSON, no invented codes) and writes the buddy's message in its own voice.
- `src/lib/buddies.functions.ts` list/save/toggle/delete/run-now.
- `src/routes/api/public/hooks/run-due-buddies.ts` + hourly pg_cron job `run-due-buddies` (runs each buddy at its own local hour, 20h de-dupe).
- Verified end to end: Shopping Sam (Kroger, 9:00 AM) returned 8 live offers with codes and source links.

## Still open
- Email/push delivery (in-app chat only today).
- Shopify store creation is still a talk-through, not a real build.
- No accounts yet — buddies belong to a token stored in the browser.

## White label + pricing (Sep 5 2026)
- `workspaces` table (owner_token PK): brand name, initials, tagline, emoji, hue, plan. Service-role only.
- `/brand` — white-label settings, live preview, hue swatches; gated to Pro/Studio.
- `/pricing` — Starter $12 / Pro $39 / Studio $149 (each exactly +50% over old price) with cost + margin table; switching plan persists.
- Shell reads brand name/initials/tagline; brand hue overrides `--brand`.
- `saveBuddy` enforces the plan's buddy limit server-side.
- QA: plan switch, brand save, header rebrand across pages, and a real Kroger run (8 live offers) all pass with no console errors.

## Still open
- Billing is plan selection only — no card charged yet (needs a payment provider).
- Email/push delivery still not wired (needs a domain you own for sending).

## Redesign (Sep 5 2026)
- Light "liquid glass" look: white canvas, mint-green brand (oklch 0.52 0.11 165), Outfit + Figtree, `glass` / `glass-soft` / `glass-tint` utilities in src/styles.css.
- Collapsed 5 pages into 3: `/` (one box + your helpers), `/builder` (helper setup), `/settings` (branding + plan). Removed `/buddies`, `/brand`, `/pricing`.
- Plan-limit errors now show as friendly copy instead of throwing.
- QA: preset -> builder -> save -> run now -> messages -> settings, no console or page errors.
