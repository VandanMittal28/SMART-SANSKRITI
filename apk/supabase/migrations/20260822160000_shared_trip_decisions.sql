-- Negotiation Support: Drift Indicator — shared persistence layer.
--
-- Phase 1 of this feature (see lib/driftCalculator.ts, lib/tripDecisions.ts)
-- works entirely on-device via localStorage. This migration adds an
-- optional "share with a companion" layer on top: once a plan owner locks
-- a baseline, they can persist it here and get a short code a travel
-- companion enters on their own copy of the app (each install serves its
-- own local WebView origin, so a clickable link can't cross devices) to
-- see the same drift indicator and react Agree / Needs discussion, without
-- needing to be a co-editor.

create table if not exists public.trip_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  share_token text not null default encode(gen_random_bytes(5), 'hex'),
  title text not null,
  baseline jsonb,
  baseline_locked_at timestamptz,
  current jsonb not null,
  attribution text not null default 'plan_change' check (attribution in ('plan_change','external_constraint')),
  exception_category text check (exception_category in ('closure','weather','availability')),
  exception_place text,
  exception_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exception_fields_together check (
    attribution = 'plan_change'
    or (exception_category is not null and exception_place is not null and exception_note is not null)
  )
);
create unique index if not exists trip_decisions_share_token_idx on public.trip_decisions(share_token);
create index if not exists trip_decisions_owner_id_idx on public.trip_decisions(owner_id, updated_at desc);

create table if not exists public.trip_decision_reactions (
  decision_id uuid not null references public.trip_decisions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('agree','needs_discussion')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (decision_id, user_id)
);
create index if not exists trip_decision_reactions_decision_id_idx on public.trip_decision_reactions(decision_id);

alter table public.trip_decisions enable row level security;
alter table public.trip_decision_reactions enable row level security;

drop policy if exists "trip_decisions viewable by owner" on public.trip_decisions;
create policy "trip_decisions viewable by owner" on public.trip_decisions for select using (auth.uid() = owner_id);
drop policy if exists "trip_decisions insertable by owner" on public.trip_decisions;
create policy "trip_decisions insertable by owner" on public.trip_decisions for insert with check (auth.uid() = owner_id);
drop policy if exists "trip_decisions updatable by owner" on public.trip_decisions;
create policy "trip_decisions updatable by owner" on public.trip_decisions for update using (auth.uid() = owner_id);
drop policy if exists "trip_decisions deletable by owner" on public.trip_decisions;
create policy "trip_decisions deletable by owner" on public.trip_decisions for delete using (auth.uid() = owner_id);

drop policy if exists "reactions viewable by reactor or decision owner" on public.trip_decision_reactions;
create policy "reactions viewable by reactor or decision owner" on public.trip_decision_reactions for select using (
  auth.uid() = user_id
  or exists (select 1 from public.trip_decisions d where d.id = decision_id and d.owner_id = auth.uid())
);
drop policy if exists "reactions insertable by reactor" on public.trip_decision_reactions;
create policy "reactions insertable by reactor" on public.trip_decision_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "reactions updatable by reactor" on public.trip_decision_reactions;
create policy "reactions updatable by reactor" on public.trip_decision_reactions for update using (auth.uid() = user_id);

-- A companion reaches a decision via its share code, before they hold any
-- direct row grant on it — this is the one read that must cross the
-- owner-only RLS boundary. security definer runs it as the function's
-- owner (which RLS does not restrict), so it can look up the one row
-- matching an unguessable code; it never lists or searches by anything else.
create or replace function public.get_trip_decision_by_token(p_token text)
returns public.trip_decisions
language sql
security definer
set search_path = public
as $$
  select * from public.trip_decisions where share_token = p_token limit 1;
$$;

revoke all on function public.get_trip_decision_by_token(text) from public;
grant execute on function public.get_trip_decision_by_token(text) to authenticated;
