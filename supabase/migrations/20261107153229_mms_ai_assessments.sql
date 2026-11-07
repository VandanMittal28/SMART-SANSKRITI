-- Advisory AI output: never modifies incident status, priority, or assignment.
create table public.mms_ai_assessments (
  incident_id uuid primary key references public.mms_incidents(id) on delete cascade,
  value text not null check (value in ('relevant', 'uncertain', 'irrelevant')),
  reason text not null check (char_length(trim(reason)) between 1 and 300),
  model text not null check (char_length(model) between 1 and 200),
  assessed_at timestamptz not null default now(),
  requested_by uuid not null references auth.users(id)
);
alter table public.mms_ai_assessments enable row level security;
revoke all on public.mms_ai_assessments from public, anon, authenticated;
grant select, insert on public.mms_ai_assessments to authenticated;
create policy mms_ai_assessments_site_read on public.mms_ai_assessments
  for select to authenticated using (exists (
    select 1 from public.mms_incidents i where i.id = incident_id
      and (select mms_private.has_site_access(i.site_id))
  ));
create policy mms_ai_assessments_manager_insert on public.mms_ai_assessments
  for insert to authenticated with check (
    requested_by = (select auth.uid()) and exists (
      select 1 from public.mms_incidents i where i.id = incident_id
        and (select mms_private.has_site_role(i.site_id, array['admin','manager']))
    )
  );
-- No update/delete grants: the first completed assessment is retained.
create index mms_ai_assessments_requested_by_idx on public.mms_ai_assessments(requested_by);
