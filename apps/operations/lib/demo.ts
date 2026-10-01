import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { site, staff, zones } from './domain.ts';

export type Point = { latitude: number; longitude: number; accuracy?: number };
export type Assessment = 'relevant' | 'uncertain' | 'irrelevant' | 'unavailable';
export type ReportState = 'review' | 'unassigned' | 'assigned' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'dismissed';
export type DemoReport = {
  id: string; receiptHash: string; category: string; note: string; zoneId: string; point: Point | null;
  evidenceId: string | null; completionEvidenceId: string | null; assessment: Assessment; assessmentReason: string; status: ReportState;
  assigneeId: string | null; assignmentReason: string | null; createdAt: string; assignedAt: string | null;
  resolvedAt: string | null; alerts: string[]; history: { at: string; actor: string; action: string; note: string }[];
};
export type Duty = { id: string; zoneId: string; onDuty: boolean; point: Point | null; locationAt: string | null };
export type DemoData = { version: 1; reports: DemoReport[]; duties: Duty[] };
const file = path.join(process.cwd(), '.data', 'report-demo.json');
export const evidenceDir = path.join(process.cwd(), '.data', 'report-evidence');
const categories = ['Property damage', 'Littering', 'Restricted access', 'Harassment', 'Safety hazard', 'Other site-rule concern'];
const initial = (): DemoData => ({ version: 1, reports: [], duties: staff.map((s, index) => ({ id: s.id, zoneId: zones[index % zones.length].id, onDuty: true, point: null, locationAt: null })) });
let queue: Promise<unknown> = Promise.resolve();
async function read(): Promise<DemoData> {
  try {
    const value = JSON.parse(await readFile(file, 'utf8')) as DemoData;
    if (value.version !== 1 || !Array.isArray(value.reports) || !Array.isArray(value.duties)) throw new Error('Unsupported demo data');
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return initial();
  }
}
export function transact<T>(run: (data: DemoData) => T | Promise<T>, save = true): Promise<T> {
  const pending = queue.then(async () => {
    const data = await read();
    const result = await run(data);
    if (save) {
      await mkdir(path.dirname(file), { recursive: true });
      const temp = `${file}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(temp, file);
    }
    return result;
  });
  queue = pending.catch(() => undefined);
  return pending;
}
export const receiptHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export const validPoint = (v: unknown): v is Point => !!v && typeof v === 'object' && Number.isFinite((v as Point).latitude) && Math.abs((v as Point).latitude) <= 90 && Number.isFinite((v as Point).longitude) && Math.abs((v as Point).longitude) <= 180 && ((v as Point).accuracy === undefined || (Number.isFinite((v as Point).accuracy) && (v as Point).accuracy! >= 0));
const active = (r: DemoReport) => ['assigned', 'acknowledged', 'in_progress'].includes(r.status);
const distance = (a: Point, b: Point) => {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos((a.latitude + b.latitude) * rad / 2);
  const y = (b.latitude - a.latitude) * rad;
  return Math.round(6371000 * Math.hypot(x, y));
};
export function dispatch(data: DemoData, report: DemoReport, now = new Date().toISOString()) {
  if (report.assessment !== 'relevant' || !['unassigned', 'review'].includes(report.status)) return;
  const candidates = data.duties.filter(d => d.onDuty && !data.reports.some(r => r.id !== report.id && r.assigneeId === d.id && active(r)));
  const ranked = candidates.map(d => {
    const fresh = d.point && d.locationAt && Date.parse(now) - Date.parse(d.locationAt) <= 120_000 && Date.parse(now) >= Date.parse(d.locationAt);
    return { duty: d, tier: fresh && report.point ? 0 : d.zoneId === report.zoneId ? 1 : 2, meters: fresh && report.point ? distance(d.point!, report.point) : Infinity, workload: data.reports.filter(r => r.assigneeId === d.id && r.status !== 'dismissed').length };
  }).sort((a,b) => a.tier-b.tier || a.meters-b.meters || a.workload-b.workload || a.duty.id.localeCompare(b.duty.id));
  const chosen = ranked[0];
  if (!chosen) {
    report.status = 'unassigned';
    if (!report.alerts.includes('no_staff')) report.alerts.push('no_staff');
    return;
  }
  report.assigneeId = chosen.duty.id;
  report.assignedAt = now;
  report.status = 'assigned';
  report.assignmentReason = chosen.tier === 0 ? `Fresh GPS estimate: ${chosen.meters} m straight-line distance` : chosen.tier === 1 ? 'Allocated to the same duty zone' : 'Available staff at this site';
  report.history.push({ at: now, actor: 'Auto dispatch demo', action: 'assigned', note: `Assigned to ${chosen.duty.id}. ${report.assignmentReason}.` });
}
export function checkAlerts(data: DemoData, now = new Date().toISOString()) {
  const time = Date.parse(now);
  for (const r of data.reports) {
    if (r.status === 'assigned' && r.assignedAt && time - Date.parse(r.assignedAt) >= 60_000 && !r.alerts.includes('unaccepted')) r.alerts.push('unaccepted');
    if (!['resolved','closed','dismissed'].includes(r.status) && time - Date.parse(r.createdAt) >= 300_000 && !r.alerts.includes('overdue')) r.alerts.push('overdue');
  }
}
export function retryDispatch(data: DemoData, now = new Date().toISOString()) {
  for (const r of data.reports.filter(r => r.status === 'unassigned')) dispatch(data, r, now);
}
export function safeReport(r: DemoReport) {
  const { receiptHash: _receiptHash, ...safe } = r;
  return safe;
}
export function guestStatus(r: DemoReport) { return { id: r.id, category: r.category, status: r.status, createdAt: r.createdAt, updatedAt: r.history.at(-1)?.at ?? r.createdAt }; }
export function validateSubmission(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid report');
  const v = input as Record<string, unknown>;
  if (typeof v.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(v.id) || !categories.includes(String(v.category)) || typeof v.note !== 'string' || v.note.length > 1200 || !zones.some(z => z.id === v.zoneId) || (v.point != null && !validPoint(v.point))) throw new Error('Invalid report details');
  return { id: v.id, category: String(v.category), note: v.note, zoneId: String(v.zoneId), point: (v.point || null) as Point | null, photo: v.photo };
}
export function sessionRole(request: Request): { role: 'admin' | 'staff'; staffId?: string } | null {
  const cookie = request.headers.get('cookie')?.match(/(?:^|; )demo_role=([^;]+)/)?.[1];
  if (!cookie) return null;
  const [value, signature] = cookie.split('.');
  if (!value || !signature || !safeCompare(signature, sign(value))) return null;
  if (value === 'admin') return { role: 'admin' };
  if (value.startsWith('staff-') && staff.some(s => s.id === value.slice(6))) return { role: 'staff', staffId: value.slice(6) };
  return null;
}
const secret = process.env.OPS_DEMO_SECRET || 'local-demo-only-secret';
const sign = (value: string) => createHash('sha256').update(secret + ':' + value).digest('hex');
const safeCompare = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const roleCookie = (value: string) => `${value}.${sign(value)}`;
export const siteInfo = site;
const monitorGlobal = globalThis as typeof globalThis & { reportDemoMonitor?: ReturnType<typeof setInterval> };
export function ensureDemoMonitor() {
  if (monitorGlobal.reportDemoMonitor) return;
  const timer = setInterval(() => { void transact(data => { checkAlerts(data); retryDispatch(data); }).catch(error => console.error('Demo report monitor:', error)); }, 5000);
  timer.unref(); monitorGlobal.reportDemoMonitor = timer;
}
