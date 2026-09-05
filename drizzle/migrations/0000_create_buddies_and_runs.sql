CREATE TABLE public.buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_token TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🤖',
  tagline TEXT NOT NULL DEFAULT '',
  voice TEXT NOT NULL DEFAULT 'friend',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  kind TEXT NOT NULL DEFAULT 'simple',
  store TEXT,
  schedule_label TEXT NOT NULL DEFAULT 'Every morning · 9:00 AM',
  run_hour SMALLINT NOT NULL DEFAULT 9,
  utc_offset_minutes SMALLINT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.buddy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID NOT NULL REFERENCES public.buddies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger TEXT NOT NULL DEFAULT 'manual',
  ok BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX buddies_owner_token_idx ON public.buddies (owner_token);
CREATE INDEX buddies_due_idx ON public.buddies (enabled, run_hour);
CREATE INDEX buddy_runs_buddy_idx ON public.buddy_runs (buddy_id, created_at DESC);

GRANT ALL ON public.buddies TO service_role;
GRANT ALL ON public.buddy_runs TO service_role;

ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_runs ENABLE ROW LEVEL SECURITY;