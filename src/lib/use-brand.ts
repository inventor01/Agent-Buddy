import { useCallback, useEffect, useRef, useState } from "react";
import { ownerToken } from "./use-agents";
import { useAuth } from "./use-auth";
import { claimOwnerToken } from "./identity.functions";
import {
  getWorkspace,
  saveWorkspace,
  setPlan,
  DEFAULT_WORKSPACE,
  type Workspace,
} from "./brand.functions";

function applyHue(shade: number) {
  if (typeof document === "undefined") return;
  // Legacy saves stored a hue (e.g. 165); the monochrome scheme stores a lightness (0–1).
  const lightness = shade > 1 ? 0.21 : shade;
  document.documentElement.style.setProperty("--brand", `oklch(${lightness} 0 0)`);
}

export function useBrand() {
  const { user, ready: authReady } = useAuth();
  const [brand, setBrand] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [ready, setReady] = useState(false);
  const token = useRef("");

  const load = useCallback(async () => {
    if (!token.current) return;
    try {
      const ws = await getWorkspace({ data: { ownerToken: token.current } });
      setBrand(ws);
      applyHue(ws.brandHue);
    } catch {
      /* keep defaults */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const nextToken = user?.id ?? ownerToken();
    if (user?.id && token.current && token.current !== nextToken) {
      void claimOwnerToken({ data: { fromToken: token.current, toToken: nextToken } }).catch(
        () => {},
      );
    }
    token.current = nextToken;
    void load();
  }, [authReady, user?.id, load]);

  const save = useCallback(async (next: Omit<Workspace, "plan">) => {
    const ws = await saveWorkspace({
      data: { ownerToken: token.current || ownerToken(), ...next },
    });
    setBrand(ws);
    applyHue(ws.brandHue);
    return ws;
  }, []);

  const choosePlan = useCallback(async (plan: "starter" | "pro" | "studio") => {
    const ws = await setPlan({ data: { ownerToken: token.current || ownerToken(), plan } });
    setBrand(ws);
    return ws;
  }, []);

  return { brand, ready, save, choosePlan, reload: load };
}
