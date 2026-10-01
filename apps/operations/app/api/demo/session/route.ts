import { staff } from '../../../../lib/domain';
import { demoAccess, failure, json } from '../../../../lib/demo-http';
import { roleCookie, sessionRole } from '../../../../lib/demo';
export const runtime = 'nodejs';
export async function GET(request: Request) { try { demoAccess(request); return json(request, { session: sessionRole(request), staff }); } catch(e) { return failure(request,e); } }
export async function POST(request: Request) {
  try {
    demoAccess(request);
    const body = await request.json();
    const value = body.role === 'admin' ? 'admin' : body.role === 'staff' && staff.some(s => s.id === body.staffId) ? `staff-${body.staffId}` : null;
    if (!value) throw new Error('Choose a role and staff member');
    const response = json(request, { role: body.role, staffId: body.staffId });
    response.headers.set('Set-Cookie', `demo_role=${roleCookie(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
    return response;
  } catch(e) { return failure(request,e); }
}
export async function DELETE(request: Request) { try { demoAccess(request); const response = json(request,{ ok:true }); response.headers.set('Set-Cookie','demo_role=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return response; } catch(e) { return failure(request,e); } }
