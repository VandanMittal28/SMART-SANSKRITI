'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Operations } from './operations';
import { staff, zones } from '../lib/domain';
import type { DemoReport, Duty } from '../lib/demo';

type Session = { role: 'admin' | 'staff'; staffId?: string };
type Report = Omit<DemoReport, 'receiptHash'>;
type View = { reports: Report[]; duties?: Duty[]; duty?: Duty };
type AdminPage = 'reports' | 'team' | 'dashboard';
type StaffTab = 'Duty' | 'Reports' | 'Profile';
type Filter = 'all' | 'review' | 'camera' | 'active' | 'done';

const ACTIVE_STATES = ['assigned', 'acknowledged', 'in_progress'];
const DONE_STATES = ['resolved', 'closed', 'dismissed'];

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Request failed');
  return value;
}

const nameOf = (id: string | null) => staff.find(s => s.id === id)?.name || 'Unassigned';
const zoneOf = (id: string) => zones.find(z => z.id === id)?.name || id;

/** Rolls over into hours and days: an overnight report once read "2276m ago". */
function age(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

const STATUS_LABEL: Record<string, string> = {
  review: 'Needs review',
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  acknowledged: 'Accepted',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  dismissed: 'Dismissed',
};

function statusKind(status: string): string {
  if (status === 'review') return 'review';
  if (status === 'unassigned') return 'unassigned';
  if (status === 'resolved') return 'done';
  if (status === 'closed' || status === 'dismissed') return 'closed';
  return 'active';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="ops-badge" data-kind={statusKind(status)}>
      {STATUS_LABEL[status] ?? status.replaceAll('_', ' ')}
    </span>
  );
}

/**
 * An automated detection is an unconfirmed machine guess. It is marked wherever
 * it appears so a reviewer never mistakes it for an eyewitness account.
 */
function OriginBadge({ report }: { report: Report }) {
  if (report.origin !== 'automated') return null;
  return <span className="ops-origin">Camera detection · unconfirmed</span>;
}

function Evidence({ report }: { report: Report }) {
  if (!report.evidenceId) return null;
  return (
    <img
      className="ops-evidence"
      alt={report.origin === 'automated'
        ? 'Frame captured by the automated camera detection'
        : 'Photo attached by the visitor'}
      src={`/api/demo/evidence?id=${encodeURIComponent(report.id)}`}
    />
  );
}

function History({ report }: { report: Report }) {
  return (
    <details>
      <summary>Action history ({report.history.length})</summary>
      {report.history.map((entry, index) => (
        <p key={index}>
          {new Date(entry.at).toLocaleString()} · <strong>{entry.actor}</strong>: {entry.note || entry.action}
        </p>
      ))}
    </details>
  );
}

// ── Role entry ──────────────────────────────────────────────────────────────

function RoleEntry({
  profile, onProfile, onEnter, error,
}: {
  profile: string;
  onProfile: (id: string) => void;
  onEnter: (role: 'admin' | 'staff') => void;
  error: string;
}) {
  return (
    <main className="ops-entry">
      <div className="ops-entry-card">
        <p className="ops-overline">Heritage Park · local demo</p>
        <h1>Monument Management System</h1>
        <p>Choose a workspace. These are demonstration roles, not verified accounts.</p>
        {error && <p className="ops-banner" data-tone="error" role="alert">{error}</p>}
        <div className="ops-role-grid">
          <button onClick={() => onEnter('admin')} type="button">
            <strong>Admin</strong>
            <span>Review reports and camera detections, assign work, oversee the site.</span>
          </button>
          <button onClick={() => onEnter('staff')} type="button">
            <strong>Ground staff</strong>
            <span>See your duty area and the cases assigned to you.</span>
          </button>
        </div>
        <label className="ops-field">
          <span>Ground staff demo profile</span>
          <select value={profile} onChange={event => onProfile(event.target.value)}>
            {staff.map(member => (
              <option key={member.id} value={member.id}>{member.name} · {member.role}</option>
            ))}
          </select>
        </label>
      </div>
    </main>
  );
}

// ── Admin: report queue ─────────────────────────────────────────────────────

function ReportCard({
  report, onAction, busy,
}: {
  report: Report;
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const unconfirmed = report.origin === 'automated';
  return (
    <article className="ops-card" data-unconfirmed={unconfirmed}>
      <div className="ops-card-head">
        <h3>{report.category}</h3>
        <span className="ops-card-meta">{age(report.createdAt)} ago</span>
      </div>
      <div><StatusBadge status={report.status} /></div>
      <OriginBadge report={report} />

      <dl>
        <dt>Zone</dt><dd>{zoneOf(report.zoneId)}</dd>
        <dt>Owner</dt><dd>{nameOf(report.assigneeId)}</dd>
        <dt>Location</dt>
        <dd>
          {report.point
            ? `${report.point.latitude.toFixed(5)}, ${report.point.longitude.toFixed(5)} · ±${Math.round(report.point.accuracy || 0)} m`
            : 'Zone only'}
        </dd>
      </dl>

      <Evidence report={report} />
      <p className="ops-note">{report.note || 'No description provided.'}</p>

      <dl>
        <dt>AI triage</dt>
        <dd>{report.assessment} · {report.assessmentReason}</dd>
        <dt>Assignment</dt>
        <dd>{report.assignmentReason || 'Waiting for review or available staff'}</dd>
      </dl>

      {report.alerts.length > 0 && (
        <p className="ops-banner" data-tone="alert">Needs attention: {report.alerts.join(', ')}</p>
      )}

      <div className="ops-actions">
        {report.status === 'review' && (
          <>
            <button className="ops-btn" data-variant="primary" disabled={busy}
              onClick={() => onAction(report.id, 'confirm')} type="button">
              {unconfirmed ? 'Confirm & dispatch' : 'Confirm'}
            </button>
            <button className="ops-btn" data-variant="secondary" disabled={busy}
              onClick={() => onAction(report.id, 'dismiss')} type="button">Dismiss</button>
          </>
        )}
        {report.status === 'resolved' && (
          <button className="ops-btn" data-variant="primary" disabled={busy}
            onClick={() => onAction(report.id, 'close')} type="button">Close case</button>
        )}
        {DONE_STATES.includes(report.status) && (
          <button className="ops-btn" data-variant="secondary" disabled={busy}
            onClick={() => onAction(report.id, 'reopen')} type="button">Reopen</button>
        )}
      </div>

      {!['closed', 'dismissed'].includes(report.status) && (
        <label className="ops-field">
          <span>Assign or reassign</span>
          <select value={report.assigneeId || ''} disabled={busy}
            onChange={event => onAction(report.id, 'assign', { staffId: event.target.value })}>
            <option value="">Choose a staff member…</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>{member.name} · {member.role}</option>
            ))}
          </select>
        </label>
      )}

      <History report={report} />
    </article>
  );
}

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'review', label: 'Needs review' },
  { id: 'camera', label: 'Camera detections' },
  { id: 'active', label: 'Active work' },
  { id: 'done', label: 'Closed' },
];

function ReportsPage({
  reports, onAction, busy,
}: {
  reports: Report[];
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => ({
    total: reports.length,
    review: reports.filter(r => r.status === 'review').length,
    camera: reports.filter(r => r.origin === 'automated').length,
    active: reports.filter(r => ACTIVE_STATES.includes(r.status)).length,
    alerts: reports.filter(r => r.alerts.length > 0).length,
  }), [reports]);

  const visible = useMemo(() => reports.filter(report => {
    if (filter === 'review') return report.status === 'review';
    if (filter === 'camera') return report.origin === 'automated';
    if (filter === 'active') return ACTIVE_STATES.includes(report.status);
    if (filter === 'done') return DONE_STATES.includes(report.status);
    return true;
  }), [reports, filter]);

  return (
    <>
      <p className="ops-overline">Heritage Park · reports and detections</p>
      <h1>Every report. One accountable response.</h1>
      <p className="ops-lede">
        Visitor reports and automated camera detections arrive here first. A detection is an
        unconfirmed machine guess — confirm it on site before any action follows.
      </p>

      <dl className="ops-tiles">
        <div className="ops-tile"><dt>Total</dt><dd>{counts.total}</dd></div>
        <div className="ops-tile" data-accent="attention"><dt>Needs review</dt><dd>{counts.review}</dd></div>
        <div className="ops-tile" data-accent="camera"><dt>Camera detections</dt><dd>{counts.camera}</dd></div>
        <div className="ops-tile"><dt>Active work</dt><dd>{counts.active}</dd></div>
        <div className="ops-tile" data-accent="attention"><dt>Alerts</dt><dd>{counts.alerts}</dd></div>
      </dl>

      <div className="ops-filters" role="group" aria-label="Filter reports">
        {FILTERS.map(option => (
          <button key={option.id} className="ops-filter" type="button"
            aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
            {option.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="ops-empty">
          <strong>Nothing here right now</strong>
          {filter === 'all'
            ? 'Reports from the visitor app will appear as they arrive.'
            : 'No reports match this filter.'}
        </div>
      ) : (
        <div className="ops-cards">
          {visible.map(report => (
            <ReportCard key={report.id} report={report} onAction={onAction} busy={busy} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Admin: ground team ──────────────────────────────────────────────────────

function TeamPage({
  duties, reports, onDuty, busy,
}: {
  duties: Duty[];
  reports: Report[];
  onDuty: (id: string, patch: Record<string, unknown>) => void;
  busy: boolean;
}) {
  return (
    <>
      <p className="ops-overline">Heritage Park · ground team</p>
      <h1>The right people, in the right place.</h1>
      <p className="ops-lede">
        Duty areas decide who a confirmed report goes to. A fresh location lets dispatch pick the
        nearest officer instead of falling back to the zone.
      </p>

      {duties.length === 0 ? (
        <div className="ops-empty"><strong>No duty records</strong>Staff duty state will appear here.</div>
      ) : (
        <div className="ops-cards">
          {duties.map(duty => {
            const workload = reports.filter(
              r => r.assigneeId === duty.id && ACTIVE_STATES.includes(r.status),
            ).length;
            const fresh = duty.locationAt && Date.now() - Date.parse(duty.locationAt) <= 120_000;
            return (
              <article className="ops-card" key={duty.id}>
                <div className="ops-card-head">
                  <h3>{nameOf(duty.id)}</h3>
                  <span className="ops-badge" data-kind={duty.onDuty ? 'done' : 'closed'}>
                    {duty.onDuty ? 'On duty' : 'Off duty'}
                  </span>
                </div>
                <dl>
                  <dt>Area</dt><dd>{zoneOf(duty.zoneId)}</dd>
                  <dt>Open work</dt><dd>{workload}</dd>
                  <dt>Location</dt>
                  <dd>{duty.locationAt ? `${age(duty.locationAt)} old · ${fresh ? 'fresh' : 'stale'}` : 'Not shared'}</dd>
                </dl>
                <label className="ops-field">
                  <span>Duty zone</span>
                  <select value={duty.zoneId} disabled={busy}
                    onChange={event => onDuty(duty.id, { zoneId: event.target.value })}>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </label>
                <div className="ops-actions">
                  <button className="ops-btn" data-variant="secondary" disabled={busy} type="button"
                    onClick={() => onDuty(duty.id, { onDuty: !duty.onDuty })}>
                    {duty.onDuty ? 'Set off duty' : 'Set on duty'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Ground staff (phone) ────────────────────────────────────────────────────

function StaffScreen({
  session, data, tab, onTab, onAction, onDuty, error, notice, busy,
  completionPhotos, onPhoto, onExit,
}: {
  session: Session;
  data: View | null;
  tab: StaffTab;
  onTab: (tab: StaffTab) => void;
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
  onDuty: (id: string, patch: Record<string, unknown>) => void;
  error: string;
  notice: string;
  busy: boolean;
  completionPhotos: Record<string, string>;
  onPhoto: (id: string, dataUrl: string) => void;
  onExit: () => void;
}) {
  const mine = data?.reports ?? [];
  const duty = data?.duty;
  const current = mine.find(r => ACTIVE_STATES.includes(r.status));

  return (
    <main className="ops-staff">
      <header>
        <p className="ops-overline">Heritage Park · staff</p>
        <h1>{tab}</h1>
      </header>

      {error && <p className="ops-banner" data-tone="error" role="alert">{error}</p>}
      {notice && <p className="ops-banner" data-tone="ok" role="status">{notice}</p>}

      {tab === 'Duty' && (
        <section className="ops-staff-card">
          <p className="ops-overline">Today&apos;s area</p>
          <h2>{duty ? zoneOf(duty.zoneId) : 'Loading…'}</h2>
          <p>{duty?.onDuty
            ? 'On duty · your location is shared while this screen is open'
            : 'Off duty · location sharing is stopped'}</p>
          <p>GPS: {duty?.locationAt ? `${age(duty.locationAt)} old` : 'no location yet'}</p>
          <div className="ops-actions">
            <button className="ops-btn" data-variant="primary" disabled={busy} type="button"
              onClick={() => onDuty(session.staffId!, { onDuty: !duty?.onDuty })}>
              {duty?.onDuty ? 'End duty' : 'Start duty'}
            </button>
          </div>
          <p style={{ marginTop: 14 }}>
            <strong>Current assignment:</strong> {current ? `${current.category} · ${zoneOf(current.zoneId)}` : 'None right now'}
          </p>
        </section>
      )}

      {tab === 'Reports' && (
        mine.length === 0
          ? <div className="ops-empty"><strong>Nothing assigned</strong>Confirmed reports for you will appear here.</div>
          : mine.map(report => (
            <article className="ops-staff-card" key={report.id}>
              <div className="ops-card-head">
                <h3 style={{ margin: 0 }}>{report.category}</h3>
                <StatusBadge status={report.status} />
              </div>
              <OriginBadge report={report} />
              <p>{zoneOf(report.zoneId)} · received {age(report.createdAt)} ago</p>
              <Evidence report={report} />
              <p className="ops-note">{report.note || 'No description provided.'}</p>
              {report.point && (
                <p>
                  <a href={`geo:${report.point.latitude},${report.point.longitude}?q=${report.point.latitude},${report.point.longitude}`}>
                    Open {report.point.latitude.toFixed(5)}, {report.point.longitude.toFixed(5)} in maps
                  </a>
                </p>
              )}
              <div className="ops-actions">
                {report.status === 'assigned' && (
                  <button className="ops-btn" data-variant="primary" disabled={busy} type="button"
                    onClick={() => onAction(report.id, 'accept')}>Accept</button>
                )}
                {report.status === 'acknowledged' && (
                  <button className="ops-btn" data-variant="primary" disabled={busy} type="button"
                    onClick={() => onAction(report.id, 'start')}>Start work</button>
                )}
                {report.status === 'in_progress' && (
                  <button className="ops-btn" data-variant="primary" disabled={busy} type="button"
                    onClick={() => {
                      const note = prompt('Resolution note (at least 5 characters)');
                      if (note) onAction(report.id, 'resolve', { note, photo: completionPhotos[report.id] || null });
                    }}>Resolve</button>
                )}
                {ACTIVE_STATES.includes(report.status) && (
                  <button className="ops-btn" data-variant="secondary" disabled={busy} type="button"
                    onClick={() => {
                      const note = prompt('What help is needed?');
                      if (note) onAction(report.id, 'help', { note });
                    }}>Need help</button>
                )}
              </div>
              {report.status === 'in_progress' && (
                <label className="ops-field">
                  <span>Completion photo (optional)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2_000_000) return;
                      const reader = new FileReader();
                      reader.onload = () => onPhoto(report.id, String(reader.result));
                      reader.readAsDataURL(file);
                    }} />
                </label>
              )}
            </article>
          ))
      )}

      {tab === 'Profile' && (
        <section className="ops-staff-card">
          <h2>{nameOf(session.staffId!)}</h2>
          <p>{staff.find(s => s.id === session.staffId)?.role}</p>
          <p>{duty ? zoneOf(duty.zoneId) : 'Loading duty area'}</p>
          <div className="ops-actions">
            <button className="ops-btn" data-variant="secondary" type="button" onClick={onExit}>
              Switch role
            </button>
          </div>
        </section>
      )}

      <nav className="ops-staff-nav" aria-label="Staff sections">
        {(['Duty', 'Reports', 'Profile'] as StaffTab[]).map(item => (
          <button key={item} type="button" aria-current={tab === item ? 'page' : undefined}
            onClick={() => onTab(item)}>{item}</button>
        ))}
      </nav>
    </main>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────

export function DemoWorkspace() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState(staff[0].id);
  const [page, setPage] = useState<AdminPage>('reports');
  const [data, setData] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<StaffTab>('Duty');

  const load = useCallback(async () => {
    const result = await api<View>('/api/demo/reports');
    setData(result);
  }, []);

  useEffect(() => {
    void api<{ session: Session | null }>('/api/demo/session')
      .then(value => setSession(value.session))
      .catch(e => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!session) return;
    void load().catch(e => setError((e as Error).message));
    const timer = setInterval(() => void load().catch(e => setError((e as Error).message)), 5000);
    return () => clearInterval(timer);
  }, [session, load]);

  useEffect(() => {
    if (session?.role !== 'staff' || !data?.duty?.onDuty || !navigator.geolocation) return;
    const send = () => navigator.geolocation.getCurrentPosition(
      position => {
        void api('/api/demo/staff', 'PATCH', {
          point: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }).then(() => load()).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 8_000 },
    );
    send();
    const timer = setInterval(send, 30_000);
    return () => clearInterval(timer);
  }, [session?.role, data?.duty?.onDuty, load]);

  async function enter(role: 'admin' | 'staff') {
    try {
      await api('/api/demo/session', 'POST', { role, staffId: profile });
      setSession({ role, staffId: role === 'staff' ? profile : undefined });
      setError('');
    } catch (e) { setError((e as Error).message); }
  }

  async function exit() {
    await fetch('/api/demo/session', { method: 'DELETE' });
    setSession(null);
    setData(null);
  }

  async function action(id: string, name: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await api('/api/demo/reports', 'PATCH', { id, action: name, ...extra });
      setNotice(`Saved: ${name}`);
      setError('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function duty(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await api('/api/demo/staff', 'PATCH', { id, ...patch });
      setError('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  if (session === undefined) return <main className="ops-entry"><p style={{ color: '#fff' }}>Loading…</p></main>;
  if (!session) {
    return <RoleEntry profile={profile} onProfile={setProfile} onEnter={role => void enter(role)} error={error} />;
  }

  if (session.role === 'staff') {
    return (
      <StaffScreen
        session={session} data={data} tab={tab} onTab={setTab}
        onAction={(id, name, extra) => void action(id, name, extra)}
        onDuty={(id, patch) => void duty(id, patch)}
        error={error} notice={notice} busy={busy}
        completionPhotos={completionPhotos}
        onPhoto={(id, dataUrl) => setCompletionPhotos(previous => ({ ...previous, [id]: dataUrl }))}
        onExit={() => void exit()}
      />
    );
  }

  const reports = data?.reports ?? [];
  const pendingReview = reports.filter(r => r.status === 'review').length;

  return (
    <div className="ops-shell">
      <header className="ops-topbar">
        <span className="ops-topbar-brand">MMS · Admin</span>
        <nav aria-label="Admin sections">
          <button className="ops-tab" type="button" aria-current={page === 'reports' ? 'page' : undefined}
            onClick={() => setPage('reports')}>
            Reports{pendingReview > 0 ? ` (${pendingReview})` : ''}
          </button>
          <button className="ops-tab" type="button" aria-current={page === 'team' ? 'page' : undefined}
            onClick={() => setPage('team')}>Ground team</button>
          <button className="ops-tab" type="button" aria-current={page === 'dashboard' ? 'page' : undefined}
            onClick={() => setPage('dashboard')}>Site dashboard</button>
        </nav>
        <button className="ops-ghost" type="button" onClick={() => void exit()}>Switch role</button>
      </header>

      {page === 'dashboard' ? <Operations /> : (
        <main className="ops-main">
          {error && <p className="ops-banner" data-tone="error" role="alert">{error}</p>}
          {notice && <p className="ops-banner" data-tone="ok" role="status">{notice}</p>}

          {page === 'reports' && (
            <ReportsPage reports={reports} busy={busy}
              onAction={(id, name, extra) => void action(id, name, extra)} />
          )}
          {page === 'team' && (
            <TeamPage duties={data?.duties ?? []} reports={reports} busy={busy}
              onDuty={(id, patch) => void duty(id, patch)} />
          )}
        </main>
      )}
    </div>
  );
}
