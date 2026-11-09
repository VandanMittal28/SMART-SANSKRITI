"use client";
import { useEffect, useState } from "react";
import { createMmsBrowserClient } from "../../lib/supabase-browser";
import { CloudDemoStorage } from "../../lib/taj-pilot/cloud-storage";
import { TajPilot } from "./taj-pilot";
import styles from "./taj-pilot.module.css";
export function MmsCrowdFeature() {
  const [storage, setStorage] = useState<CloudDemoStorage | null>(null);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let active = true;
    let client: ReturnType<typeof createMmsBrowserClient>;
    try { client = createMmsBrowserClient(); }
    catch { setError("MMS database configuration is unavailable. Contact your administrator."); return; }
    let generation = 0;
    async function authorize() {
      const current = ++generation;
      setStorage(null);
      const { data, error: authError } = await client.auth.getUser();
      if (!active || current !== generation) return;
      if (authError || !data.user) { setError("Sign in to MMS to open your saved crowd simulation."); return; }
      const { data: membership, error: accessError } = await client.from("mms_memberships").select("site_id").eq("site_id", "taj-mahal").eq("user_id", data.user.id).maybeSingle();
      if (!active || current !== generation) return;
      if (accessError || !membership) { setError("Taj Mahal staff access is required for this feature."); return; }
      setUserId(data.user.id); setError(""); setStorage(new CloudDemoStorage(client, data.user.id));
    }
    void authorize().catch(() => { if(active) setError("MMS access could not be verified. Please sign in again."); });
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    const { data: listener } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { generation++; setStorage(null); setError("Sign in to MMS to open your saved crowd simulation."); }
      if (event === "SIGNED_IN") {
        // Run auth calls outside the auth callback's lock.
        clearTimeout(authTimer);
        authTimer = setTimeout(() => { if (active) void authorize().catch(() => { if(active) setError("MMS access could not be verified. Please sign in again."); }); }, 0);
      }
    });
    return () => { active = false; clearTimeout(authTimer); listener.subscription.unsubscribe(); };
  }, []);
  return <><div className={styles.mmsBar}><a href="/">← Back to MMS</a><strong>Crowd simulation</strong><span>Private training workspace · saved to MMS database</span></div>{storage ? <TajPilot key={userId} storage={storage} /> : <main className={styles.page}><h1>MMS crowd simulation</h1><p role="status">{error || "Checking staff access…"}</p><a href="/">Open MMS sign-in</a></main>}</>;
}
