import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkAlerts, dispatch, evidenceDir, ensureDemoMonitor, guestStatus, receiptHash, retryDispatch, safeReport, sessionRole, transact, validateSubmission, type DemoReport } from '../../../../lib/demo';
import { assessWithNvidia } from '../../../../lib/nvidia-assessment';
import { demoAccess, failure, json, options } from '../../../../lib/demo-http';
export const runtime = 'nodejs';
export async function OPTIONS(request: Request) { return options(request); }
export async function GET(request: Request) {
  try {
    demoAccess(request, true); ensureDemoMonitor();
    const url = new URL(request.url);
    const id = url.searchParams.get('id'); const token = url.searchParams.get('token');
    if (id && token) return json(request, await transact(data => { checkAlerts(data); const report = data.reports.find(r => r.id === id && r.receiptHash === receiptHash(token)); if (!report) throw new Error('Receipt not found'); return guestStatus(report); }));
    const session = sessionRole(request); if (!session) throw new Error('Role required');
    return json(request, await transact(data => {
      checkAlerts(data); retryDispatch(data);
      if (session.role === 'admin') return { reports: data.reports.map(safeReport), duties: data.duties };
      return { reports: data.reports.filter(r => r.assigneeId === session.staffId).map(safeReport), duty: data.duties.find(d => d.id === session.staffId) };
    }));
  } catch(e) { return failure(request,e); }
}
export async function POST(request: Request) {
  try {
    demoAccess(request,true); ensureDemoMonitor();
    const raw = await request.text();
    if (raw.length > 3_000_000) throw new Error('Report exceeds size limit');
    const parsed = JSON.parse(raw); const input = validateSubmission(parsed);
    if (typeof parsed.token !== 'string' || !/^[0-9a-f]{64}$/i.test(parsed.token)) throw new Error('Invalid receipt token');
    let bytes: Buffer | null = null; let mime = '';
    if (input.photo != null) {
      if (typeof input.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(input.photo)) throw new Error('Use a JPEG, PNG or WebP photo');
      mime = input.photo.match(/^data:image\/(jpeg|png|webp)/)![1];
      bytes = Buffer.from(input.photo.split(',')[1], 'base64');
      if (!bytes.length || bytes.length > 2_000_000) throw new Error('Photo must be under 2 MB');
      const signature = bytes.subarray(0,12).toString('hex');
      if (mime === 'jpeg' && !signature.startsWith('ffd8ff') || mime === 'png' && !signature.startsWith('89504e470d0a1a0a') || mime === 'webp' && bytes.subarray(0,4).toString() !== 'RIFF') throw new Error('Invalid image data');
    }
    const duplicate = await transact(data => {
      const existing = data.reports.find(r => r.id === input.id);
      if (!existing) return null;
      if (existing.receiptHash !== receiptHash(parsed.token)) throw new Error('Report ID already used');
      return { id: existing.id, status: existing.status, token: parsed.token, duplicate: true };
    }, false);
    if (duplicate) return json(request, duplicate, 200);
    const assessment = await assessWithNvidia({ category: input.category, note: input.note, photo: bytes, mime });
    const result = await transact(async data => {
      const existing = data.reports.find(r => r.id === input.id);
      if (existing) { if (existing.receiptHash !== receiptHash(parsed.token)) throw new Error('Report ID already used'); return { id: existing.id, status: existing.status, token: parsed.token, duplicate: true }; }
      const token = parsed.token; const now = new Date().toISOString();
      const evidenceId = bytes ? `${randomUUID()}.${mime === 'jpeg' ? 'jpg' : mime}` : null;
      if (bytes && evidenceId) { await mkdir(evidenceDir,{recursive:true}); await writeFile(path.join(evidenceDir,evidenceId), bytes,{mode:0o600}); }
      // An automated camera detection always waits for a human to confirm it,
      // whatever the independent triage thought. A visitor report keeps the
      // existing behaviour.
      const automated = input.origin === 'automated';
      const submitter = automated ? 'Automated camera detection' : 'Guest visitor';
      const report: DemoReport = { id:input.id, receiptHash:receiptHash(token), origin:input.origin, category:input.category, note:input.note, zoneId:input.zoneId, point:input.point, evidenceId, completionEvidenceId:null, assessment:assessment.value, assessmentReason:assessment.reason, status:!automated && assessment.value === 'relevant' ? 'unassigned':'review', assigneeId:null, assignmentReason:null, createdAt:now, assignedAt:null, resolvedAt:null, alerts:[], history:[{at:now,actor:submitter,action:'submitted',note:automated ? 'Unconfirmed camera detection received. Confirm on site before acting.' : 'Visitor report received.'},{at:now,actor:'NVIDIA AI',action:'assessed',note:assessment.reason}] };
      data.reports.unshift(report); dispatch(data,report,now);
      return { id: report.id, status:report.status, token, duplicate:false };
    });
    return json(request,result,201);
  } catch(e) { return failure(request,e); }
}
export async function PATCH(request: Request) {
  try {
    const session = demoAccess(request);
    if (!session) throw new Error('Role required'); ensureDemoMonitor();
    const patchRaw = await request.text(); if (patchRaw.length > 3_000_000) throw new Error('Action exceeds size limit');
    const body = JSON.parse(patchRaw);
    const result = await transact(async data => {
      checkAlerts(data);
      const report = data.reports.find(r => r.id === body.id); if (!report) throw new Error('Report not found');
      const now = new Date().toISOString(); const action = String(body.action); const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (session.role === 'staff') {
        if (report.assigneeId !== session.staffId) throw new Error('Forbidden');
        const allowed: Record<string, string> = { accept:'assigned', start:'acknowledged', resolve:'in_progress', help:'assigned' };
        if (action === 'help' ? !['assigned','acknowledged','in_progress'].includes(report.status) : report.status !== allowed[action]) throw new Error('Action unavailable');
        if (['resolve','help'].includes(action) && note.length < 5) throw new Error('Add an action note');
        if (action === 'accept') report.status = 'acknowledged';
        if (action === 'start') report.status = 'in_progress';
        if (action === 'resolve') {
          if (body.photo != null) {
            if (typeof body.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(body.photo)) throw new Error('Invalid completion photo');
            const kind = body.photo.match(/^data:image\/(jpeg|png|webp)/)![1]; const bytes = Buffer.from(body.photo.split(',')[1], 'base64');
            if (!bytes.length || bytes.length > 2_000_000) throw new Error('Completion photo must be under 2 MB');
            const sig=bytes.subarray(0,12).toString('hex'); if (kind==='jpeg'&&!sig.startsWith('ffd8ff')||kind==='png'&&!sig.startsWith('89504e470d0a1a0a')||kind==='webp'&&bytes.subarray(0,4).toString()!=='RIFF') throw new Error('Invalid completion image');
            const file=`${randomUUID()}.${kind==='jpeg'?'jpg':kind}`; await mkdir(evidenceDir,{recursive:true}); await writeFile(path.join(evidenceDir,file),bytes,{mode:0o600}); report.completionEvidenceId=file;
          }
          report.status = 'resolved'; report.resolvedAt = now; }
        if (action === 'help' && !report.alerts.includes('needs_help')) report.alerts.push('needs_help');
      } else {
        if (action === 'confirm' && report.status === 'review') { report.assessment = 'relevant'; report.status = 'unassigned'; dispatch(data,report,now); }
        else if (action === 'dismiss' && ['review','unassigned'].includes(report.status)) report.status = 'dismissed';
        else if (action === 'close' && report.status === 'resolved') report.status = 'closed';
        else if (action === 'reopen' && ['resolved','closed','dismissed'].includes(report.status)) { report.status = 'unassigned'; report.assigneeId = null; report.assignedAt = null; dispatch(data,report,now); }
        else if (action === 'assign' && typeof body.staffId === 'string' && data.duties.some(d => d.id === body.staffId) && !['closed','dismissed'].includes(report.status)) {
          if (data.reports.some(r => r.id !== report.id && r.assigneeId === body.staffId && ['assigned','acknowledged','in_progress'].includes(r.status))) throw new Error('Staff member has an active assignment');
          report.assigneeId = body.staffId; report.assignedAt = now; report.status = 'assigned'; report.assignmentReason = 'Admin assignment';
        } else throw new Error('Action unavailable');
      }
      report.history.push({at:now,actor:session.role === 'admin' ? 'Demo admin':session.staffId!,action,note:note || action});
      retryDispatch(data,now);
      return safeReport(report);
    });
    return json(request,result);
  } catch(e) { return failure(request,e); }
}
