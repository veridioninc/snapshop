-- Profile creation must be serialized: two simultaneous first logins must not
-- both become operators. This function is deliberately service-role-only.
create or replace function public.ensure_profile(p_user_id uuid)
returns table (id uuid, is_operator boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('snapshop-profile-bootstrap', 0));

  insert into public.profiles (id, is_operator)
  select p_user_id, not exists (select 1 from public.profiles)
  on conflict on constraint profiles_pkey do nothing;

  return query
    select p.id, p.is_operator
    from public.profiles p
    where p.id = p_user_id;
end;
$$;

revoke all on function public.ensure_profile(uuid) from public, anon, authenticated;
grant execute on function public.ensure_profile(uuid) to service_role;
