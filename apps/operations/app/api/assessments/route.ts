import { createClient } from '@supabase/supabase-js';
import { assessMmsIncident, type MmsAssessment } from '../../../lib/mms-assessment.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const pending = new Map<string, Promise<MmsAssessment>>();
const fields = 'incident_id,value,reason,model,assessed_at';
class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new RequestError(403, 'Request origin is not allowed.');
    const bearer = request.headers.get('authorization');
    if (!bearer?.startsWith('Bearer ')) throw new RequestError(401, 'Sign in to assess incidents.');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new RequestError(503, 'MMS database configuration is missing.');
    const db = createClient(url, key, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(bearer.slice(7));
    if (authError || !auth.user) throw new RequestError(401, 'Sign in again to assess incidents.');
    const raw = await request.text();
    if (raw.length > 200) throw new RequestError(400, 'Invalid assessment request.');
    let id: unknown;
    try { id = JSON.parse(raw).incidentId; } catch { throw new RequestError(400, 'Invalid assessment request.'); }
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new RequestError(400, 'Choose a valid incident.');
    const incidentId = id;
    // Scope de-duplication to the verified user; never reuse another user's authorization.
    const workKey = `${auth.user.id}:${incidentId}`;
    const existing = async (): Promise<MmsAssessment | null> => {
      const { data, error } = await db.from('mms_ai_assessments').select(fields).eq('incident_id', incidentId).maybeSingle();
      if (error) throw new RequestError(503, 'AI assessment storage is unavailable. Manual review is still available.');
      return data as MmsAssessment | null;
    };
    let job = pending.get(workKey);
    if (!job) {
      if (pending.size >= 8) throw new RequestError(429, 'AI assessment is busy. Please try again shortly.');
      job = assessMmsIncident(incidentId, {
        async incident() {
          const { data: item, error } = await db.from('mms_incidents').select('site_id,category,description').eq('id', incidentId).maybeSingle();
          if (error || !item) throw new RequestError(404, 'Incident not found.');
          const { data: membership, error: membershipError } = await db.from('mms_memberships').select('role').eq('site_id', item.site_id).eq('user_id', auth.user!.id).maybeSingle();
          if (membershipError || !membership || !['admin', 'manager'].includes(membership.role)) throw new RequestError(403, 'A site manager must request AI assessment.');
          const { data: detail, error: detailError } = await db.from('mms_visitor_report_details').select('photo_path,visitor_category').eq('incident_id', incidentId).maybeSingle();
          if (detailError) throw new RequestError(503, 'Report evidence is unavailable. Review the report manually.');
          return { category: detail?.visitor_category ?? item.category, description: item.description, photoPath: detail?.photo_path ?? null };
        },
        existing,
        async photo(path) {
          const { data, error } = await db.storage.from('visitor-reports').download(path);
          if (error || !data) throw new Error('Photo unavailable');
          return Buffer.from(await data.arrayBuffer());
        },
        async save(result) {
          const { error } = await db.from('mms_ai_assessments').insert({ ...result, requested_by: auth.user!.id });
          if (error?.code === '23505') {
            const winner = await existing();
            if (winner) return winner;
          }
          if (error) throw new RequestError(503, 'AI assessment could not be saved. Review the report manually.');
          return result;
        },
      });
      pending.set(workKey, job);
      void job.finally(() => pending.delete(workKey)).catch(() => {});
    }
    return reply(await job);
  } catch (error) {
    return reply({ error: error instanceof RequestError ? error.message : 'AI assessment is unavailable. Review the report manually.' }, error instanceof RequestError ? error.status : 503);
  }
}
