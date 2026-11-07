'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MmsAssessment } from '../lib/mms-assessment';

const labels = { spam: 'Suspected spam — manager review required', relevant: 'Needs staff inspection', uncertain: 'Needs human review', irrelevant: 'Possibly unrelated — review before dismissing', unavailable: 'AI unavailable — review manually' };

export function IncidentAiReview({ incidentId, client, isManager }: { incidentId: string; client: SupabaseClient; isManager: boolean }) {
  const [assessment, setAssessment] = useState<MmsAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  async function assess() {
    setBusy(true); setError('');
    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError || !data.session) throw new Error('Sign in again to request AI review.');
      const response = await fetch('/api/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ incidentId }), signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'AI review could not complete.');
      setAssessment(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'AI review is unavailable. Review the incident manually.'); }
    finally { setBusy(false); }
  }

  async function open() {
    if (loaded || busy) return;
    setLoaded(true); setBusy(true);
    try {
      const { data, error: readError } = await client.from('mms_ai_assessments').select('incident_id,value,reason,model,assessed_at').eq('incident_id', incidentId).maybeSingle();
      if (readError) throw new Error('AI review storage is unavailable. You can continue reviewing this incident manually.');
      if (data) setAssessment(data as MmsAssessment);
      else if (isManager) await assess();
    } catch (e) { setError(e instanceof Error ? e.message : 'AI review is unavailable. Review the incident manually.'); }
    finally { setBusy(false); }
  }

  return <details className="mms-ai-review" onToggle={(event) => { if (event.currentTarget.open) void open(); }}>
    <summary>AI review{assessment ? ` · ${labels[assessment.value]}` : ''}</summary>
    <p className="mms-muted">AI advice supports your review. A manager decides whether to confirm, assign, or dismiss the incident. Opening this panel as a manager sends the report text and attached photo to NVIDIA for assessment.</p>
    {busy && <p role="status">Assessing the report…</p>}
    {error && <p role="alert" className="mms-error">{error}</p>}
    {assessment && <div className="mms-ai-result"><b>{labels[assessment.value]}</b><p>{assessment.reason}</p><small>{new Date(assessment.assessed_at).toLocaleString()} · {assessment.model}</small></div>}
    {!busy && !assessment && !error && !isManager && <p>No AI assessment yet. A site manager can request one.</p>}
    {isManager && !busy && (error || assessment?.value === 'unavailable') && <button type="button" className="mms-link-button" onClick={() => void assess()}>Retry AI review</button>}
  </details>;
}
