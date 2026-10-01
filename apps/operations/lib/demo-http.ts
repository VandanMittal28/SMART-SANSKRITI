import { sessionRole } from './demo';
const androidOrigin = 'https://appassets.androidplatform.net';
export function demoAccess(request: Request, guest = false) {
  const url = new URL(request.url);
  const host = request.headers.get('host')?.split(':')[0] ?? url.hostname;
  if (!['localhost','127.0.0.1','10.0.2.2'].includes(host) || (process.env.NODE_ENV === 'production' && process.env.OPS_LOCAL_DEMO !== 'true')) throw new Error('Local demo only');
  const origin = request.headers.get('origin');
  const publicOrigin = `${url.protocol}//${request.headers.get('host') ?? url.host}`;
  if (origin && origin !== publicOrigin && !(guest && origin === androidOrigin)) throw new Error('Origin blocked');
  return sessionRole(request);
}
export function cors(request: Request): Record<string,string> {
  return request.headers.get('origin') === androidOrigin ? { 'Access-Control-Allow-Origin': androidOrigin, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
}
export function options(request: Request) { try { demoAccess(request, true); return new Response(null, { status: 204, headers: cors(request) }); } catch { return new Response(null, { status: 403 }); } }
export function json(request: Request, value: unknown, status = 200) { return Response.json(value, { status, headers: { ...cors(request), 'Cache-Control': 'no-store' } }); }
export function failure(request: Request, error: unknown) { const message = error instanceof Error ? error.message : 'Request failed'; return json(request, { error: message }, ['Local demo only','Origin blocked','Role required','Forbidden'].includes(message) ? 403 : 400); }
export function requireRole(request: Request, role: 'admin' | 'staff') { const session = demoAccess(request); if (!session) throw new Error('Role required'); if (session.role !== role) throw new Error('Forbidden'); return session; }
