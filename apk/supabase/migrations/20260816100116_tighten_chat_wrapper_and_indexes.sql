-- The wrapper only validates identity and invokes two separately hardened
-- RPCs, so it does not need elevated privileges itself.
alter function public.append_chat_exchange(text, text, text)
  security invoker;

-- Cover the second column of the composite primary key for badge-side joins
-- and foreign-key maintenance.
create index if not exists user_badges_badge_id_idx
  on public.user_badges (badge_id);
