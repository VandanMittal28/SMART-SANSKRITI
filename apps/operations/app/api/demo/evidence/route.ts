import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { evidenceDir, sessionRole, transact } from '../../../../lib/demo';
import { demoAccess, failure } from '../../../../lib/demo-http';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    demoAccess(request); const session = sessionRole(request); if (!session) throw new Error('Role required');
    const id = new URL(request.url).searchParams.get('id');
    const report = await transact(data => data.reports.find(r => r.id === id),false);
    const completion = new URL(request.url).searchParams.get('kind') === 'completion';
    const evidenceId = completion ? report?.completionEvidenceId : report?.evidenceId;
    if (!evidenceId || session.role === 'staff' && report?.assigneeId !== session.staffId) throw new Error('Forbidden');
    const extension = path.extname(evidenceId); const mime = extension === '.jpg' ? 'image/jpeg' : extension === '.png' ? 'image/png' : 'image/webp';
    const data = await readFile(path.join(evidenceDir,evidenceId));
    return new Response(data,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch(e) { return failure(request,e); }
}
