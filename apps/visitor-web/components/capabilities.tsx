"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCapabilities } from "@/lib/api";

// Which server features are switched on, so screens can explain what is
// unavailable instead of failing late. "unknown" means the check failed; the
// screens then try the request and handle its error.
type State = { status: "loading" | "ready" | "unknown"; live: boolean | null; reportsReachable: boolean | null };

type CapabilitiesValue = State & { refresh: () => void; markLiveUnavailable: () => void };

const CapabilitiesContext = createContext<CapabilitiesValue | null>(null);

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading", live: null, reportsReachable: null });

  const refresh = useCallback(() => {
    getCapabilities()
      .then((caps) => setState({ status: "ready", live: caps.live, reportsReachable: caps.reports.reachable }))
      .catch(() => setState((previous) => ({ ...previous, status: "unknown" })));
  }, []);

  useEffect(() => refresh(), [refresh]);

  const markLiveUnavailable = useCallback(() => setState((previous) => ({ ...previous, live: false })), []);
  const value = useMemo(() => ({ ...state, refresh, markLiveUnavailable }), [state, refresh, markLiveUnavailable]);
  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities(): CapabilitiesValue {
  const value = useContext(CapabilitiesContext);
  if (!value) throw new Error("useCapabilities must be used inside CapabilitiesProvider");
  return value;
}
