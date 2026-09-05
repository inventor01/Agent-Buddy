CREATE TABLE public.workspaces (
  owner_token text PRIMARY KEY,
  brand_name text NOT NULL DEFAULT 'Agent Buddy',
  brand_initials text NOT NULL DEFAULT 'AB',
  brand_tagline text NOT NULL DEFAULT 'Drag-and-drop agents',
  brand_emoji text NOT NULL DEFAULT '🤖',
  brand_hue integer NOT NULL DEFAULT 186,
  plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.workspaces TO service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages workspaces"
ON public.workspaces FOR ALL TO service_role
USING (true) WITH CHECK (true);