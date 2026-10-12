begin;
alter table public.mt_activity_cadence add column monitor_since date not null default ((now() at time zone 'Europe/Paris')::date);
insert into public.mt_activity_cadence(client_id,expected_days)
 select id,case coalesce(programme->>'formule_prix_eur',programme->>'offre') when '1500' then 1 when 'private_performance' then 1 when '900' then 2 when '850' then 2 when 'performance_plus' then 2 when '400' then 3 when 'elite' then 3 when '240' then 4 when 'privilege' then 4 else 7 end from public.mt_clients on conflict do nothing;
create function public.mt_activity_counts() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('unread',count(*),'important',count(*) filter(where e.important)) from public.mt_activity e
 where not exists(select 1 from public.mt_activity_reads r where r.admin_id=auth.uid() and r.event_id=e.id)
$$;
revoke all on function public.mt_activity_counts() from public,anon;
grant execute on function public.mt_activity_counts() to authenticated;
-- Admin notes were protected against client writes but readable through direct API calls.
-- Keep existing admin writes; expose reads only through a server-authorized admin RPC.
revoke select on public.mt_clients from authenticated,anon;
grant select(id,slug,prenom,programme,client_email) on public.mt_clients to authenticated;
create function public.mt_admin_client(p_slug text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.mt_admin_users where user_id=auth.uid()) then raise exception 'Accès administrateur requis'; end if;
 return (select to_jsonb(c) from public.mt_clients c where slug=p_slug);
end $$;
revoke all on function public.mt_admin_client(text) from public,anon;
grant execute on function public.mt_admin_client(text) to authenticated;
revoke execute on function public.mt_protect_client_identity(),public.mt_guard_selection_cap() from public,anon,authenticated;
create or replace function mt_private.scan_missing() returns void language plpgsql security definer set search_path='' as $$
declare c record; last_day date; anchor date; days integer; today date:=(now() at time zone 'Europe/Paris')::date;
begin
 for c in select x.*,a.expected_days,a.enabled,a.monitor_since from public.mt_clients x left join public.mt_activity_cadence a on a.client_id=x.id where x.programme->>'statut'='actif' loop
  if c.enabled=false then continue; end if;
  days:=coalesce(c.expected_days,case coalesce(c.programme->>'formule_prix_eur',c.programme->>'offre') when '1500' then 1 when 'private_performance' then 1 when '900' then 2 when '850' then 2 when 'performance_plus' then 2 when '400' then 3 when 'elite' then 3 when '240' then 4 when 'privilege' then 4 else 7 end);
  select max(key::date) into last_day from jsonb_each(coalesce(c.programme->'suivi','{}')) where value->>'filled'='true' and key ~ '^\d{4}-\d{2}-\d{2}$';
  anchor:=coalesce(last_day,case when c.programme#>>'{timeline,dateDebut}' ~ '^\d{4}-\d{2}-\d{2}$' then (c.programme#>>'{timeline,dateDebut}')::date end,c.monitor_since,today);
  if today-anchor>=days then
   insert into public.mt_activity(client_id,kind,source_key,payload,important) values(c.id,'missing',anchor::text,jsonb_build_object('last_date',last_day,'expected_days',days,'due_date',anchor+days),true) on conflict do nothing;
  end if;
 end loop;
end $$;

create function mt_private.init_cadence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.mt_activity_cadence(client_id,expected_days) values(new.id,case coalesce(new.programme->>'formule_prix_eur',new.programme->>'offre') when '1500' then 1 when 'private_performance' then 1 when '900' then 2 when '850' then 2 when 'performance_plus' then 2 when '400' then 3 when 'elite' then 3 when '240' then 4 when 'privilege' then 4 else 7 end) on conflict do nothing;
 return new;
end $$;
revoke all on function mt_private.init_cadence() from public,anon,authenticated;
create trigger mt_init_activity_cadence after insert on public.mt_clients for each row execute function mt_private.init_cadence();
commit;

