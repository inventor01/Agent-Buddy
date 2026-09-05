import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const oauthOptions = () =>
    typeof window !== "undefined" ? { redirectTo: window.location.origin } : {};

  const signInWithGoogle = useCallback(
    () => supabase.auth.signInWithOAuth({ provider: "google", options: oauthOptions() }),
    [],
  );

  const signInWithGithub = useCallback(
    () => supabase.auth.signInWithOAuth({ provider: "github", options: oauthOptions() }),
    [],
  );

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return {
    session,
    user: session?.user ?? null,
    ready,
    signInWithGoogle,
    signInWithGithub,
    signOut,
  };
}
