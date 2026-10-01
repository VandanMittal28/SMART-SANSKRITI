import { staff, zones } from '../../../../lib/domain';
import { checkAlerts, retryDispatch, transact, validPoint } from '../../../../lib/demo';
import { demoAccess, failure, json } from '../../../../lib/demo-http';
export const runtime = 'nodejs';
export async function PATCH(request: Request) {
  try {
    const session = demoAccess(request); if (!session) throw new Error('Role required');
    const body = await request.json();
    const id = session.role === 'staff' ? session.staffId : body.id;
    if (!staff.some(s => s.id === id)) throw new Error('Invalid staff member');
    if (session.role === 'staff' && (body.zoneId !== undefined || body.id && body.id !== id)) throw new Error('Forbidden');
    const result = await transact(data => {
      const duty = data.duties.find(d => d.id === id)!;
      if (body.zoneId !== undefined) { if (!zones.some(z => z.id === body.zoneId)) throw new Error('Invalid zone'); duty.zoneId = body.zoneId; }
      if (body.onDuty !== undefined) { if (typeof body.onDuty !== 'boolean') throw new Error('Invalid duty state'); duty.onDuty = body.onDuty; if (!duty.onDuty) { duty.point=null; duty.locationAt=null; } }
      if (body.point !== undefined) { if (!duty.onDuty || !validPoint(body.point)) throw new Error('Invalid on-duty location'); duty.point=body.point; duty.locationAt=new Date().toISOString(); }
      checkAlerts(data); retryDispatch(data);
      return duty;
    });
    return json(request,result);
  } catch(e) { return failure(request,e); }
}
