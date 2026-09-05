# Agent Buddy

Say one plain sentence, get a helper that runs on its own — daily store coupons,
birthday texts, reminders — and pins the answer back to you by text or email.

Built with TanStack Start, React, Tailwind CSS, and Supabase (Postgres + Auth).

## Local development

```sh
git clone <this-repository-url>
cd agent-buddy
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

## One-time setup this repo needs

This app was exported from a Lovable project, so some of its infrastructure
already exists (a live Supabase project, an AI gateway key). To run it
standalone — locally or on a host like Railway — you need:

### 1. Supabase (database)
The app already expects three tables: `buddies`, `buddy_runs`, `workspaces`.
If you're pointing at a fresh Supabase project, run the SQL files in
`drizzle/migrations/` in order, in the Supabase SQL editor (or via
`drizzle-kit migrate` with `LOVABLE_DB_MIGRATION_URL` set to your Postgres
connection string). `0002_add_notification_prefs.sql` is new in this pass —
run it even against an existing project.

Copy `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
(and the `VITE_` client-side equivalents) from your project's API settings
into `.env`.

### 2. Google / GitHub sign-in
Sign-in itself is wired up in the app (`src/lib/use-auth.ts`, the account menu
in the header), but the OAuth providers must be turned on **in your Supabase
project dashboard** — this needs your own Google Cloud OAuth client and/or
GitHub OAuth App, which only you can create:

- Supabase dashboard → **Authentication → Providers** → enable Google and/or
  GitHub, pasting in that provider's client ID/secret.
- In Google Cloud / GitHub's OAuth app settings, set the authorized redirect
  URI to `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
- Add your deployed domain (and `http://localhost:3000` for local dev) to
  Supabase's **Redirect URLs** allow-list under Authentication → URL
  Configuration.

Signing in for the first time moves any buddies you made anonymously in that
browser onto your account (`src/lib/identity.functions.ts`).

### 3. SMS (Twilio) and email (Resend)
Settings → Notifications lets each user turn on SMS/email and enter a phone
number/address. Delivery itself needs your own accounts:

- **Twilio**: create an account, buy/verify a sending number, and set
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- **Resend**: create an account, verify a sending domain, and set
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

Without these set, sending silently no-ops (logged, not thrown) — the rest of
the app works fine either way.

### 4. The hourly scheduler
`src/routes/api/public/hooks/run-due-buddies.ts` runs every enabled buddy
whose local hour just arrived. It requires
`Authorization: Bearer <LOVABLE_CRON_SECRET>` — set `LOVABLE_CRON_SECRET`
(and optionally `LOVABLE_CRON_SECRET_PREVIOUS` during rotation) and point a
scheduler at `POST https://<your-domain>/api/public/hooks/run-due-buddies`
once an hour. If this ran previously via a Supabase `pg_cron` job pointed at
a Lovable-hosted URL, update that job's target URL to your new domain — a
Railway "Cron Jobs" service works too if you'd rather keep it off Supabase.

### 5. AI
`LOVABLE_API_KEY` (from your Lovable project's API settings) powers "build my
helper from one sentence" and the daily run write-ups, via Lovable's AI
gateway (`src/lib/ai-gateway.server.ts`). Swap that file's `baseURL`/model if
you'd rather point at a different OpenAI-compatible provider later.

## Deploying to Railway

1. Push this repo to GitHub, then in Railway: **New Project → Deploy from
   GitHub repo** and pick it.
2. Railway auto-detects Node via Nixpacks, which already installs
   dependencies with `npm ci` in its own install phase; `railway.json` in
   this repo only pins the build command to `npm run build` (don't add a
   second `npm ci` there — Nixpacks' layer caching and a repeated `npm ci`
   don't get along, and it'll fail with an `EBUSY` on `node_modules/.cache`)
   and the start command to `npm run start`
   (`node .output/server/index.mjs` — a plain Node server, not the
   Cloudflare Worker build Lovable's sandbox defaults to).
3. In the Railway service's **Variables** tab, paste in everything from
   `.env.example` with real values (section above).
4. Deploy. Railway assigns a public domain under **Settings → Networking →
   Generate Domain** — add that domain to Supabase's Auth redirect allow-list
   (step 2 above) before testing sign-in.

## Known limits (be aware before calling this production-ready)

- **Ownership model**: buddies/workspaces are keyed by an opaque
  `owner_token` (a signed-in user's id, or a random token for anonymous
  visitors) trusted from the client and checked with the Supabase
  *service-role* key — Postgres Row Level Security is enabled on these tables
  but not actually enforced by policy for this flow. That's fine for a demo;
  before real users depend on it, move buddy/workspace reads and writes onto
  `requireSupabaseAuth` (already written in
  `src/integrations/supabase/auth-middleware.ts`, just not wired to these
  server functions yet) and add RLS policies keyed on the authenticated user.
- **Billing**: `/settings` lets someone pick a plan but nothing charges a
  card (needs Stripe or similar).
- No rate limiting on the scheduled-run endpoint beyond the bearer secret.
