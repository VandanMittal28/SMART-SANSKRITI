import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_STORAGE_KEY, type DemoStorage } from "./demo-repository.ts";
export class CloudDemoStorage implements DemoStorage {
  private version = 0;
  private client: SupabaseClient;
  private userId: string;
  constructor(client: SupabaseClient, userId: string) { this.client = client; this.userId = userId; }
  private key(key: string) { if (key !== DEMO_STORAGE_KEY) throw new Error("Only the isolated demo workspace is supported."); }
  async getItem(key: string) {
    this.key(key);
    const { data, error } = await this.client.from("mms_crowd_demo_workspaces").select("journal,version").eq("user_id", this.userId).eq("site_id", "taj-mahal").maybeSingle();
    if (error) throw new Error("Could not load the MMS demo database. Check your sign-in and retry.");
    this.version = data?.version ?? 0;
    return data?.journal ?? null;
  }
  async setItem(key: string, value: string) {
    this.key(key);
    const { data, error } = await this.client.rpc("mms_save_crowd_demo", { p_journal: value, p_expected_version: this.version });
    if (error) throw new Error(error.code === "40001" ? "Demo changed elsewhere. Reload before continuing." : "MMS database save failed. Check your sign-in and retry.");
    this.version = data;
  }
}
