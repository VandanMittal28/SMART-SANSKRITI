'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createMmsBrowserClient } from '../lib/supabase-browser';

const ADMIN_EMAIL = 'smartsanskritiai@gmail.com';
const monuments = [
  { id: 'taj-mahal', name: 'Taj Mahal', city: 'Agra, Uttar Pradesh', initials: 'TM' },
  { id: 'qutub-minar', name: 'Qutub Minar', city: 'Delhi', initials: 'QM' },
  { id: 'red-fort', name: 'Red Fort', city: 'Delhi', initials: 'RF' },
  { id: 'konark', name: 'Konark Sun Temple', city: 'Konark, Odisha', initials: 'KS' },
] as const;
const statusNames: Record<string, string> = {
  reported: 'Reported', under_review: 'Under review', confirmed: 'Confirmed', assigned: 'Assigned',
  acknowledged: 'Acknowledged', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed', dismissed: 'Dismissed',
};
const nextStates: Record<string, string[]> = {
  reported: ['under_review'], under_review: ['confirmed', 'dismissed'], confirmed: ['assigned'],
  assigned: ['acknowledged'], acknowledged: ['in_progress'], in_progress: ['resolved'], resolved: ['closed'],
};
type Membership = { site_id: string; role: string; username: string; display_name: string; user_id: string };
type Zone = { id: string; name: string; site_id: string };
type Incident = {
  id: string; site_id: string; zone_id: string; title: string; description: string; category: string; source: string;
  priority: string; status: string; assignee_id: string | null; version: number; created_at: string;
  updated_at: string; zone?: { name: string }; events?: { status: string; note: string; created_at: string; actor_id: string }[];
};
type VisitorReportDetails = { incident_id: string; visitor_category: string; latitude: number | null; longitude: number | null; accuracy_m: number | null; photo_path: string | null; photo_url?: string };
const panel: CSSProperties = { background: 'white', border: '1px solid #e5eaec', borderRadius: 16, padding: 22 };
const button: CSSProperties = { border: 0, borderRadius: 9, background: '#21746e', color: 'white', padding: '10px 14px', fontWeight: 700 };
const field: CSSProperties = { width: '100%', border: '1px solid #dce5e5', borderRadius: 9, padding: '11px 12px', color: '#223b42', background: 'white' };

export function MmsApp() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('base');
  const [password, setPassword] = useState('');
  const [siteId, setSiteId] = useState<string>('taj-mahal');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [visitorDetails, setVisitorDetails] = useState<VisitorReportDetails[]>([]);
  const [staff, setStaff] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', category: 'Maintenance', priority: 'medium', zoneId: '' });
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const monument = monuments.find((site) => site.id === siteId) ?? monuments[0];
  const membership = memberships.find((item) => item.site_id === siteId);
  const isManager = membership?.role === 'admin' || membership?.role === 'manager';

  useEffect(() => {
    try {
      const supabase = createMmsBrowserClient();
      setClient(supabase);
      void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
      const { data } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
      return () => data.subscription.unsubscribe();
    } catch (e) { setError((e as Error).message); setReady(true); }
  }, []);

  useEffect(() => {
    if (!client || !session) { setMemberships([]); return; }
    let alive = true;
    void (async () => {
      const { error: bootstrapError } = await client.rpc('mms_bootstrap_admin');
      if (bootstrapError && !bootstrapError.message.toLowerCase().includes('not authorized')) throw bootstrapError;
      const { data, error: membershipError } = await client.from('mms_memberships').select('user_id,site_id,role,username,display_name').order('site_id');
      if (membershipError) throw membershipError;
      if (!alive) return;
      setMemberships((data ?? []) as Membership[]);
      if (data?.length && !data.some((item) => item.site_id === siteId)) setSiteId(data[0].site_id);
      setError('');
    })().catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [client, session, siteId]);

  const load = useCallback(async () => {
    if (!client || !session || !membership) return;
    setLoading(true);
    const [zoneResult, incidentResult, staffResult] = await Promise.all([
      client.from('mms_zones').select('id,name,site_id').eq('site_id', siteId).eq('active', true).order('name'),
      client.from('mms_incidents').select('id,site_id,zone_id,title,description,category,source,priority,status,assignee_id,version,created_at,updated_at').eq('site_id', siteId).order('updated_at', { ascending: false }).limit(100),
      client.from('mms_memberships').select('user_id,site_id,role,username,display_name').eq('site_id', siteId).order('display_name'),
    ]);
    const firstError = zoneResult.error || incidentResult.error || staffResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    const incidentRows = (incidentResult.data ?? []) as Incident[];
    const detailResult = incidentRows.length ? await client.from('mms_visitor_report_details').select('incident_id,visitor_category,latitude,longitude,accuracy_m,photo_path').in('incident_id', incidentRows.map((row) => row.id)) : { data: [], error: null };
    if (detailResult.error) { setError(detailResult.error.message); setLoading(false); return; }
    const details = (detailResult.data ?? []) as VisitorReportDetails[];
    const withPhotos = await Promise.all(details.map(async (detail) => {
      if (!detail.photo_path) return detail;
      const { data } = await client.storage.from('visitor-reports').createSignedUrl(detail.photo_path, 300);
      return { ...detail, photo_url: data?.signedUrl };
    }));
    const eventResult = incidentRows.length ? await client.from('mms_incident_events').select('incident_id,status,note,created_at,actor_id').eq('site_id', siteId).in('incident_id', incidentRows.map((row) => row.id)).order('created_at') : { data: [], error: null };
    if (eventResult.error) { setError(eventResult.error.message); setLoading(false); return; }
    const events = eventResult.data ?? [];
    setZones((zoneResult.data ?? []) as Zone[]);
    setIncidents(incidentRows.map((row) => ({ ...row, zone: { name: zoneResult.data?.find((z) => z.id === row.zone_id)?.name ?? 'Zone' }, events: events.filter((event) => event.incident_id === row.id) })));
    setVisitorDetails(withPhotos);
    setStaff((staffResult.data ?? []) as Membership[]);
    setError(''); setLoading(false);
  }, [client, session, membership, siteId]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({ open: incidents.filter((item) => !['closed', 'dismissed'].includes(item.status)).length, review: incidents.filter((item) => ['reported', 'under_review'].includes(item.status)).length, assigned: incidents.filter((item) => ['assigned', 'acknowledged', 'in_progress'].includes(item.status)).length }), [incidents]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); if (!client) return;
    setError(''); setNotice('');
    const email = username.trim().toLowerCase() === 'base' ? ADMIN_EMAIL : username.trim();
    const { error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
  }
  async function recoverPassword() {
    if (!client) return;
    const email = username.trim().toLowerCase() === 'base' ? ADMIN_EMAIL : username.trim();
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
    if (resetError) setError(resetError.message); else setNotice('Password recovery link sent to the account email.');
  }
  async function createIncident(event: FormEvent) {
    event.preventDefault(); if (!client) return;
    const { error: createError } = await client.rpc('mms_create_incident', { p_site_id: siteId, p_zone_id: draft.zoneId, p_title: draft.title, p_description: draft.description, p_category: draft.category, p_priority: draft.priority });
    if (createError) { setError(createError.message); return; }
    setDraft({ title: '', description: '', category: 'Maintenance', priority: 'medium', zoneId: '' }); setShowCreate(false); setNotice('Incident saved.'); await load();
  }
  async function transition(item: Incident, status: string) {
    if (!client) return;
    const note = window.prompt(`Add an action note for ${statusNames[status] ?? status}:`);
    if (!note) return;
    const assignee = status === 'assigned' ? (assignment[item.id] || (membership?.role === 'admin' ? session?.user.id : '')) : null;
    const { error: transitionError } = await client.rpc('mms_transition_incident', { p_incident_id: item.id, p_expected_version: item.version, p_status: status, p_note: note, p_assignee_id: assignee || null });
    if (transitionError) setError(transitionError.message); else { setNotice(`Incident updated: ${statusNames[status]}`); await load(); }
  }
  async function signOut() { if (client) await client.auth.signOut(); setIncidents([]); setMemberships([]); }

  if (!ready) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Opening MMS…</main>;
  if (!session) return <main className="mms-login-wrap"><form className="mms-login" onSubmit={signIn}>
    <div className="mms-mark">S</div><p className="mms-eyebrow">SANSKRITI · STAFF PORTAL</p><h1>Monument operations</h1><p className="mms-muted">Secure access for authorized monument teams.</p>
    <label>Username or email<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="base" style={field}/></label>
    <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={field}/></label>
    <button style={{ ...button, width: '100%', marginTop: 6 }}>Sign in</button><button type="button" className="mms-link-button" onClick={() => void recoverPassword()}>Forgot password?</button>
    {notice && <p className="mms-notice">{notice}</p>}{error && <p className="mms-error" role="alert">{error}</p>}
    <p className="mms-muted mms-login-foot">First administrator: use the credentials provided for the <b>base</b> account. Site access is provisioned after email verification.</p>
  </form></main>;

  if (!memberships.length) return <main className="mms-login-wrap"><section className="mms-login"><div className="mms-mark">S</div><h1>Finish account verification</h1><p className="mms-muted">Check {session.user.email} for Supabase’s verification message, open it, then return here and sign in again.</p>{error && <p className="mms-error" role="alert">{error}</p>}<button style={button} onClick={() => void signOut()}>Sign out</button></section></main>;

  return <main className="mms-shell">
    <aside className="mms-sidebar"><div className="mms-brand"><div className="mms-mark">S</div><div><b>Sanskriti</b><small>MONUMENT OPERATIONS</small></div></div><p className="mms-sidebar-label">YOUR SITES</p>{memberships.map((item) => { const site = monuments.find((entry) => entry.id === item.site_id); return site && <button key={item.site_id} onClick={() => setSiteId(item.site_id)} className={`mms-site-button ${siteId === item.site_id ? 'active' : ''}`}><span className="mms-site-icon">{site.initials}</span><span><b>{site.name}</b><small>{site.city}</small></span></button>; })}<div className="mms-account"><b>{membership?.display_name}</b><small>{membership?.role} · {session.user.email}</small><button className="mms-link-button" onClick={() => void signOut()}>Sign out</button></div></aside>
    <section className="mms-main"><header className="mms-header"><div><p className="mms-eyebrow">{monument.city.toUpperCase()}</p><h1>{monument.name}</h1></div><button style={button} onClick={() => { setDraft((value) => ({ ...value, zoneId: zones[0]?.id ?? '' })); setShowCreate(true); }}>+ New incident</button></header>
      {error && <p className="mms-error mms-banner" role="alert">{error}</p>}{notice && <p className="mms-notice mms-banner" role="status">{notice}</p>}
      <div className="mms-summary"><article style={panel}><small>OPEN INCIDENTS</small><strong>{counts.open}</strong></article><article style={panel}><small>NEEDS REVIEW</small><strong>{counts.review}</strong></article><article style={panel}><small>ACTIVE ASSIGNMENTS</small><strong>{counts.assigned}</strong></article><article style={panel}><small>OPERATIONAL ZONES</small><strong>{zones.length}</strong></article></div>
      {showCreate && <form style={panel} className="mms-create" onSubmit={(e) => void createIncident(e)}><div className="mms-section-title"><div><p className="mms-eyebrow">NEW RECORD</p><h2>Report a site incident</h2></div><button type="button" className="mms-link-button" onClick={() => setShowCreate(false)}>Close</button></div><div className="mms-form-grid"><label>Title<input required minLength={5} maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={field}/></label><label>Zone<select required value={draft.zoneId} onChange={(e) => setDraft({ ...draft, zoneId: e.target.value })} style={field}><option value="">Select a zone</option>{zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={field}>{['Crowding','Damage','Access','Maintenance','Visitor assistance'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} style={field}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="mms-wide">Details<textarea required minLength={10} maxLength={2000} rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={field}/></label></div><button style={button}>Save incident</button></form>}
      <div className="mms-section-title mms-incidents-title"><div><p className="mms-eyebrow">SITE WORKSPACE</p><h2>Incidents</h2></div><span className="mms-muted">{loading ? 'Refreshing…' : `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</span></div>
      {incidents.length === 0 ? <section className="mms-empty" style={panel}><div>✓</div><h3>No incidents recorded</h3><p>{zones.length} zones are ready for {monument.name}. New reports will appear here.</p></section> : <section className="mms-incident-list">{incidents.map((item) => { const visitor = visitorDetails.find((detail) => detail.incident_id === item.id); return <article className="mms-incident" key={item.id} style={panel}><header><div><span className={`mms-priority ${item.priority}`}>{item.priority}</span><span className="mms-category">{visitor?.visitor_category ?? item.category}</span>{visitor && <span className="mms-category">Visitor report</span>}</div><span className={`mms-status ${['closed','resolved','dismissed'].includes(item.status) ? 'done' : ''}`}>{statusNames[item.status]}</span></header><h3>{item.title}</h3><p>{item.description}</p><div className="mms-incident-meta"><span>⌖ {item.zone?.name}</span><span>{new Date(item.created_at).toLocaleString()}</span><span>v{item.version}</span></div>{visitor?.latitude !== null && visitor?.latitude !== undefined && visitor.longitude !== null && visitor.longitude !== undefined && <p><a href={`https://maps.google.com/?q=${visitor.latitude},${visitor.longitude}`} target="_blank" rel="noreferrer">Open visitor location{visitor.accuracy_m ? ` (±${visitor.accuracy_m} m)` : ''} ↗</a></p>}{visitor?.photo_url && <a href={visitor.photo_url} target="_blank" rel="noreferrer"><img src={visitor.photo_url} alt="Photo attached to visitor report" style={{ maxWidth: 360, maxHeight: 260, objectFit: 'contain', borderRadius: 12, marginTop: 12 }}/></a>}{item.events?.length ? <details><summary>Action history ({item.events.length})</summary>{item.events.map((event, index) => <p className="mms-event" key={index}><b>{statusNames[event.status] ?? event.status}</b> · {event.note} <small>{new Date(event.created_at).toLocaleString()}</small></p>)}</details> : null}<div className="mms-actions">{(nextStates[item.status] ?? []).map((status) => <span className="mms-action-wrap" key={status}>{status === 'assigned' && isManager ? <select aria-label="Assign to staff" value={assignment[item.id] ?? ''} onChange={(e) => setAssignment({ ...assignment, [item.id]: e.target.value })}><option value="">Assign to…</option>{staff.map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name} ({person.role})</option>)}</select> : null}{(!['assigned'].includes(status) || isManager) && <button style={{ ...button, padding: '8px 12px' }} disabled={status === 'assigned' && isManager && !assignment[item.id] && membership?.role !== 'admin'} onClick={() => void transition(item, status)}>{status === 'under_review' ? 'Review' : status === 'in_progress' ? 'Start work' : status === 'acknowledged' ? 'Acknowledge' : status === 'resolved' ? 'Resolve' : status === 'closed' ? 'Close' : status === 'dismissed' ? 'Dismiss' : status === 'confirmed' ? 'Confirm' : 'Assign'}</button>}</span>)}</div></article>; })}</section>}
    </section>
  </main>;
}
