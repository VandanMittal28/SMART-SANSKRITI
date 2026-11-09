-- Isolated personal training workspaces; never real crowd or incident records.
create table public.mms_crowd_demo_workspaces (
  user_id uuid not null default auth.uid(),
  site_id text not null default 'taj-mahal' check (site_id = 'taj-mahal'),
  mode text not null default 'demo' check (mode = 'demo'),
  journal text not null check (
    octet_length(journal) <= 2000000
    and jsonb_typeof(journal::jsonb) = 'object'
    and journal::jsonb ->> 'mode' = 'demo'
    and journal::jsonb ->> 'version' = '1'
    and jsonb_typeof(journal::jsonb -> 'commands') = 'array'
    and jsonb_array_length(journal::jsonb -> 'commands') <= 2000
    and (journal::jsonb ?& array['mode','version','commands'])
  ),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, site_id),
  foreign key (user_id, site_id) references public.mms_memberships(user_id, site_id) on delete cascade
);
alter table public.mms_crowd_demo_workspaces enable row level security;
revoke all on public.mms_crowd_demo_workspaces from public, anon, authenticated;
grant select, insert on public.mms_crowd_demo_workspaces to authenticated;
grant update (journal, version, updated_at) on public.mms_crowd_demo_workspaces to authenticated;
create policy crowd_demo_read on public.mms_crowd_demo_workspaces for select to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.mms_memberships m where m.user_id = (select auth.uid()) and m.site_id = mms_crowd_demo_workspaces.site_id
));
create policy crowd_demo_insert on public.mms_crowd_demo_workspaces for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.mms_memberships m where m.user_id = (select auth.uid()) and m.site_id = mms_crowd_demo_workspaces.site_id
));
create policy crowd_demo_update on public.mms_crowd_demo_workspaces for update to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.mms_memberships m where m.user_id = (select auth.uid()) and m.site_id = mms_crowd_demo_workspaces.site_id
))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.mms_memberships m where m.user_id = (select auth.uid()) and m.site_id = mms_crowd_demo_workspaces.site_id
));

create function public.mms_save_crowd_demo(p_journal text, p_expected_version bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved_version bigint;
begin
  if auth.uid() is null then raise exception 'Sign in to MMS.' using errcode = '42501'; end if;
  if p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid version.'; end if;
  if p_expected_version = 0 then
    insert into public.mms_crowd_demo_workspaces(user_id, site_id, mode, journal)
    values (auth.uid(), 'taj-mahal', 'demo', p_journal)
    on conflict (user_id, site_id) do nothing
    returning version into saved_version;
  else
    update public.mms_crowd_demo_workspaces
    set journal = p_journal, version = version + 1, updated_at = now()
    where user_id = auth.uid() and site_id = 'taj-mahal' and version = p_expected_version
    returning version into saved_version;
  end if;
  if saved_version is null then raise exception 'Demo changed elsewhere. Reload before continuing.' using errcode = '40001'; end if;
  return saved_version;
end;
$$;
revoke all on function public.mms_save_crowd_demo(text, bigint) from public, anon;
grant execute on function public.mms_save_crowd_demo(text, bigint) to authenticated;
comment on table public.mms_crowd_demo_workspaces is 'Synthetic personal MMS training only. No real incident, live source or gate control data.';
