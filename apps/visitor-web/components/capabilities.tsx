"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCapabilities, type AiState } from "@/lib/api";

// Which server features are switched on, so screens can explain what is
// unavailable instead of failing late. "unknown" means the check failed; the
// screens then try the request and handle its error.
// reportsMode "unavailable": the public deployment, where reporting is off.
type State = {
  status: "loading" | "ready" | "unknown";
  live: boolean | null;
  /** Why live AI is off: "missing" key or "rejected" key. */
  ai: AiState | null;
  reportsMode: "local-demo" | "unavailable" | null;
  reportsReachable: boolean | null;
};

type CapabilitiesValue = State & { refresh: () => void };

const CapabilitiesContext = createContext<CapabilitiesValue | null>(null);

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading", live: null, ai: null, reportsMode: null, reportsReachable: null });

  const refresh = useCallback(() => {
    getCapabilities()
      .then((caps) => setState({ status: "ready", live: caps.live, ai: caps.ai, reportsMode: caps.reports.mode, reportsReachable: caps.reports.reachable }))
      .catch(() => setState((previous) => ({ ...previous, status: "unknown" })));
  }, []);

  useEffect(() => refresh(), [refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities(): CapabilitiesValue {
  const value = useContext(CapabilitiesContext);
  if (!value) throw new Error("useCapabilities must be used inside CapabilitiesProvider");
  return value;
}

/** One honest sentence for why live AI features are off. */
export function aiUnavailableText(ai: AiState | null): string {
  return ai === "rejected"
    ? "Live AI is unavailable right now: the AI service didn't accept this website's API key."
    : "Live AI isn't switched on yet: the AI service hasn't been configured for this website.";
}
