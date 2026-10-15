import { createBrowserClient } from '@supabase/ssr';

export function createMmsBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('MMS database configuration is missing.');
  return createBrowserClient(url, key);
}
