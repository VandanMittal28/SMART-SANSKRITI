-- Allow an owner to rename their unique, user-facing identity while the
-- existing UPDATE policy continues to enforce auth.uid() = id.
grant update (username) on public.profiles to authenticated;

-- Persist a complete request/response pair in one transaction. Calling the
-- existing single-message RPC twice from the browser could leave half a
-- conversation behind if the second request was interrupted.
create or replace function public.append_chat_exchange(
  p_user_content text,
  p_assistant_content text,
  p_monument text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  perform public.append_chat_message('user', p_user_content, p_monument);
  perform public.append_chat_message('assistant', p_assistant_content, p_monument);
end;
$$;

revoke all on function public.append_chat_exchange(text, text, text)
  from public, anon;
grant execute on function public.append_chat_exchange(text, text, text)
  to authenticated;
