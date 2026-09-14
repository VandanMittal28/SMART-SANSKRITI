import { createClient, type User } from 'npm:@supabase/supabase-js@2.101.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-razorpay-event-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export function handleOptions(request: Request) {
  return request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase server configuration is missing.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get('Authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data.user) throw new Response(JSON.stringify({ error: 'Invalid or expired session.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  return data.user
}

export async function requireAdmin(userId: string) {
  const { data, error } = await adminClient().rpc('marketplace_is_admin_for_service', { p_user_id: userId })
  if (error || data !== true) throw new Response(JSON.stringify({ error: 'Marketplace admin access required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export async function parseJson(request: Request): Promise<Record<string, unknown>> {
  try { return await request.json() as Record<string, unknown> }
  catch { throw new Response(JSON.stringify({ error: 'Valid JSON is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
}

export function errorResponse(error: unknown) {
  if (error instanceof Response) return error
  console.error(error)
  const message = error instanceof Error ? error.message : 'Unexpected marketplace error.'
  return json({ error: message }, 400)
}

