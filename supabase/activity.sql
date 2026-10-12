begin;
create schema if not exists mt_private;
revoke all on schema mt_private from public, anon, authenticated;
create table public.mt_activity (
 id bigint generated always as identity primary key,
 client_id uuid not null references public.mt_clients(id) on delete cascade,
 kind text not null check(kind in ('checkin','meal','difficulty','missing','food_open')),
 occurred_at timestamptz not null default now(),
 source_key text not null,
 payload jsonb not null default '{}',
 important boolean not null default false,
 historical boolean not null default false
);
create index mt_activity_feed on public.mt_activity(occurred_at desc,id desc);
create index mt_activity_client on public.mt_activity(client_id,occurred_at desc);
create unique index mt_activity_missing_once on public.mt_activity(client_id,source_key) where kind='missing';
create table public.mt_activity_reads (
 admin_id uuid not null references public.mt_admin_users(user_id) on delete cascade,
 event_id bigint not null references public.mt_activity(id) on delete cascade,
 read_at timestamptz not null default now(), primary key(admin_id,event_id)
);
create table public.mt_activity_settings (
 admin_id uuid primary key references public.mt_admin_users(user_id) on delete cascade,
 email_enabled boolean not null default true,
 min_hours integer not null default 24 check(min_hours between 6 and 168),
 quiet_start integer not null default 20 check(quiet_start between 0 and 23),
 quiet_end integer not null default 8 check(quiet_end between 0 and 23),
 notify_difficulty boolean not null default true,
 notify_missing boolean not null default true,
 enabled_at timestamptz not null default now()
);
create table public.mt_activity_cadence (
 client_id uuid primary key references public.mt_clients(id) on delete cascade,
 expected_days integer not null check(expected_days between 1 and 30),
 enabled boolean not null default true
);
create table public.mt_food_consent (
 client_id uuid primary key references public.mt_clients(id) on delete cascade,
 enabled boolean not null default false,
 changed_at timestamptz not null default now(), version text not null default '1'
);
alter table public.mt_activity enable row level security;
alter table public.mt_activity_reads enable row level security;
alter table public.mt_activity_settings enable row level security;
alter table public.mt_activity_cadence enable row level security;
alter table public.mt_food_consent enable row level security;
create policy activity_admin on public.mt_activity for select to authenticated using(exists(select 1 from public.mt_admin_users where user_id=auth.uid()));
create policy activity_reads on public.mt_activity_reads for all to authenticated using(admin_id=auth.uid() and exists(select 1 from public.mt_admin_users where user_id=auth.uid())) with check(admin_id=auth.uid() and exists(select 1 from public.mt_admin_users where user_id=auth.uid()));
create policy activity_settings on public.mt_activity_settings for all to authenticated using(admin_id=auth.uid() and exists(select 1 from public.mt_admin_users where user_id=auth.uid())) with check(admin_id=auth.uid() and exists(select 1 from public.mt_admin_users where user_id=auth.uid()));
create policy activity_cadence on public.mt_activity_cadence for all to authenticated using(exists(select 1 from public.mt_admin_users where user_id=auth.uid())) with check(exists(select 1 from public.mt_admin_users where user_id=auth.uid()));
create policy food_consent_read on public.mt_food_consent for select to authenticated using(exists(select 1 from public.mt_clients c where c.id=client_id and lower(c.client_email)=lower(auth.jwt()->>'email')));
revoke all on public.mt_activity,public.mt_activity_reads,public.mt_activity_settings,public.mt_activity_cadence,public.mt_food_consent from anon,authenticated;
grant select on public.mt_activity,public.mt_food_consent to authenticated;
grant select,insert,delete on public.mt_activity_reads to authenticated;
grant select,insert,update on public.mt_activity_settings,public.mt_activity_cadence to authenticated;

-- Server snapshots resolve array indices into the actual menu at the time of selection.
create function mt_private.meal_snapshot(p jsonb,w text,d text,m text) returns jsonb language sql immutable set search_path='' as $$
 with raw as (select coalesce(p#>>array['weeks',w,'days',d,m],case when w='1' then p#>>array['days',d,m] end,'') t),
 lines as (select row_number() over ()-1 idx,btrim(x) label from raw,regexp_split_to_table(regexp_replace(regexp_replace(t,'<br\s*/?>',E'\n','gi'),'<[^>]*>','','g'),E'\n+') x where btrim(x)<>''),
 choices as (select x from jsonb_array_elements(case when jsonb_typeof(p#>array['meal_selections',w,d,m])='array' then p#>array['meal_selections',w,d,m] else '[]' end) x)
 select coalesce(jsonb_agg(jsonb_build_object('index',x,'label',coalesce((select label from lines where idx::text=x#>>'{}'),'Choix indisponible dans le menu'))),'[]') from choices
$$;
create function mt_private.difficulties(v jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(label),'[]') from (values
 (case when v->>'energie' in ('1','2') then 'Énergie basse' end),
 (case when v->>'sommeil' in ('1','2') then 'Sommeil difficile' end),
 (case when v->>'digestion' in ('1','2') then 'Inconfort digestif' end),
 (case when v->>'recuperation' in ('1','2') then 'Récupération difficile' end),
 (case when v->>'adherence'='no' then 'Journée alimentaire non suivie' end),
 (case when v#>>'{session,pain}'='true' then 'Douleur signalée pendant la séance' end)
 ) s(label) where label is not null
$$;
create function mt_private.capture_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; v jsonb; w text; d text; m text; a jsonb; b jsonb; signals jsonb; prev jsonb;
begin
 -- Do not interpret an administrator editing a programme as a client action.
 if exists(select 1 from public.mt_admin_users where user_id=auth.uid()) then return new; end if;
 if new.programme->'suivi' is distinct from old.programme->'suivi' then
  for k,v in select * from jsonb_each(coalesce(new.programme->'suivi','{}')) loop
   prev:=old.programme#>array['suivi',k];
   if v->>'filled'='true' and (v-'submitted_at') is distinct from (prev-'submitted_at') then
    insert into public.mt_activity(client_id,kind,source_key,payload) values(new.id,'checkin',k,jsonb_build_object('date',k,'values',v));
    signals:=mt_private.difficulties(v);
    if jsonb_array_length(signals)>0 and signals is distinct from mt_private.difficulties(prev) then
     insert into public.mt_activity(client_id,kind,source_key,payload,important) values(new.id,'difficulty',k,jsonb_build_object('date',k,'signals',signals),true);
    end if;
   end if;
  end loop;
 end if;
 if new.programme->'meal_selections' is distinct from old.programme->'meal_selections' then
  for w in select jsonb_object_keys(coalesce(new.programme->'meal_selections','{}')||coalesce(old.programme->'meal_selections','{}')) loop
   for d in select jsonb_object_keys(coalesce(new.programme#>array['meal_selections',w],'{}')||coalesce(old.programme#>array['meal_selections',w],'{}')) loop
    for m in select unnest(array['morning','lunch','snack','dinner']) loop
     a:=coalesce(new.programme#>array['meal_selections',w,d,m],'[]'); b:=coalesce(old.programme#>array['meal_selections',w,d,m],'[]');
     if a is distinct from b then
      insert into public.mt_activity(client_id,kind,source_key,payload) values(new.id,'meal',w||'/'||d||'/'||m,jsonb_build_object('week',w,'day',d,'moment',m,'choices',mt_private.meal_snapshot(new.programme,w,d,m),'previous',mt_private.meal_snapshot(old.programme,w,d,m)));
     end if;
    end loop;
   end loop;
  end loop;
 end if;
 return new;
end $$;
revoke all on function mt_private.capture_activity() from public,anon,authenticated;
create trigger mt_capture_activity after update of programme on public.mt_clients for each row execute function mt_private.capture_activity();

-- Minimal opt-in: no URL, device, IP or time spent. One opening per Paris calendar day.
create function public.mt_food_tracking(p_enabled boolean default null,p_open boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare cid uuid; consent boolean; today text:=to_char(now() at time zone 'Europe/Paris','YYYY-MM-DD');
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 select id into cid from public.mt_clients where lower(client_email)=lower(auth.jwt()->>'email');
 if cid is null then raise exception 'Client introuvable'; end if;
 perform pg_advisory_xact_lock(hashtext(cid::text));
 if p_enabled is not null then
  insert into public.mt_food_consent(client_id,enabled) values(cid,p_enabled) on conflict(client_id) do update set enabled=excluded.enabled,changed_at=now();
  if not p_enabled then delete from public.mt_activity where client_id=cid and kind='food_open'; end if;
 end if;
 select enabled into consent from public.mt_food_consent where client_id=cid;
 if consent and p_open and not exists(select 1 from public.mt_activity where client_id=cid and kind='food_open' and source_key=today) then
  insert into public.mt_activity(client_id,kind,source_key) values(cid,'food_open',today);
 end if;
 return coalesce(consent,false);
end $$;
revoke all on function public.mt_food_tracking(boolean,boolean) from public,anon;
grant execute on function public.mt_food_tracking(boolean,boolean) to authenticated;

-- Trusted scheduler: administrators can override the default formula cadence.
create function mt_private.scan_missing() returns void language plpgsql security definer set search_path='' as $$
declare c record; last_day date; anchor date; days integer; today date:=(now() at time zone 'Europe/Paris')::date;
begin
 for c in select x.*,a.expected_days,a.enabled from public.mt_clients x left join public.mt_activity_cadence a on a.client_id=x.id where x.programme->>'statut'='actif' loop
  if c.enabled=false then continue; end if;
  days:=coalesce(c.expected_days,case coalesce(c.programme->>'formule_prix_eur',c.programme->>'offre') when '1500' then 1 when 'private_performance' then 1 when '900' then 2 when '850' then 2 when 'performance_plus' then 2 when '400' then 3 when 'elite' then 3 when '240' then 4 when 'privilege' then 4 else 7 end);
  select max(key::date) into last_day from jsonb_each(coalesce(c.programme->'suivi','{}')) where value->>'filled'='true' and key ~ '^\d{4}-\d{2}-\d{2}$';
  anchor:=coalesce(last_day,case when c.programme#>>'{timeline,dateDebut}' ~ '^\d{4}-\d{2}-\d{2}$' then (c.programme#>>'{timeline,dateDebut}')::date end,today);
  if today-anchor>=days then
   insert into public.mt_activity(client_id,kind,source_key,payload,important) values(c.id,'missing',anchor::text,jsonb_build_object('last_date',last_day,'expected_days',days,'due_date',anchor+days),true) on conflict do nothing;
  end if;
 end loop;
end $$;
revoke all on function mt_private.scan_missing() from public,anon,authenticated;

-- Historical entries explicitly carry no precise historical reception time and never email.
insert into public.mt_activity(client_id,kind,source_key,payload,historical)
 select id,'checkin',key,jsonb_build_object('date',key,'values',value),true from public.mt_clients,jsonb_each(coalesce(programme->'suivi','{}')) where value->>'filled'='true';
insert into public.mt_activity(client_id,kind,source_key,payload,historical)
 select c.id,'meal',w.key||'/'||d.key||'/'||m.key,jsonb_build_object('week',w.key,'day',d.key,'moment',m.key,'choices',mt_private.meal_snapshot(c.programme,w.key,d.key,m.key)),true
 from public.mt_clients c cross join lateral jsonb_each(coalesce(c.programme->'meal_selections','{}')) w
 cross join lateral jsonb_each(w.value) d cross join lateral jsonb_each(d.value) m
 where jsonb_typeof(m.value)='array' and jsonb_array_length(m.value)>0;
insert into public.mt_activity_settings(admin_id) select user_id from public.mt_admin_users;

create table mt_private.mail_batches (
 id uuid primary key default gen_random_uuid(),admin_id uuid not null references public.mt_admin_users(user_id) on delete cascade,
 event_ids bigint[] not null,recipient text not null,created_at timestamptz not null default now(),
 request_id bigint, attempts integer not null default 0,status text not null default 'pending', next_try timestamptz not null default now(),provider_id text
);
alter table mt_private.mail_batches enable row level security;
create function mt_private.activity_tick() returns void language plpgsql security definer set search_path='' as $$
declare s record; b record; response record; ids bigint[]; key text; hour integer:=extract(hour from now() at time zone 'Europe/Paris'); req bigint;
begin
 if not pg_try_advisory_xact_lock(72319412) then return; end if;
 perform mt_private.scan_missing();
 -- Confirm provider acceptance before marking sent; never record response bodies with sensitive data.
 for b in select * from mt_private.mail_batches where status='processing' loop
  select status_code,content into response from net._http_response where id=b.request_id;
  if found then
   if response.status_code between 200 and 299 then
    update mt_private.mail_batches set status='sent',provider_id=(response.content::jsonb)->>'id' where id=b.id;
   elsif response.status_code=429 or response.status_code>=500 or response.status_code is null then
    update mt_private.mail_batches set status=case when attempts>=4 then 'failed' else 'pending' end,next_try=now()+interval '15 minutes' where id=b.id;
   else
    update mt_private.mail_batches set status='failed' where id=b.id;
   end if;
  elsif b.next_try<now()-interval '5 minutes' then
   update mt_private.mail_batches set status=case when attempts>=4 then 'failed' else 'pending' end,next_try=now()+interval '15 minutes' where id=b.id;
  end if;
 end loop;
 for s in select p.*,u.email from public.mt_activity_settings p join auth.users u on u.id=p.admin_id join public.mt_admin_users a on a.user_id=p.admin_id where p.email_enabled loop
  if (s.quiet_start<s.quiet_end and hour>=s.quiet_start and hour<s.quiet_end) or (s.quiet_start>s.quiet_end and (hour>=s.quiet_start or hour<s.quiet_end)) then continue; end if;
  if not exists(select 1 from mt_private.mail_batches where admin_id=s.admin_id and created_at>now()-make_interval(hours=>s.min_hours)) then
   select array_agg(e.id) into ids from public.mt_activity e where important and not historical and occurred_at>=s.enabled_at
    and ((kind='difficulty' and s.notify_difficulty) or (kind='missing' and s.notify_missing))
    and not exists(select 1 from public.mt_activity_reads r where r.admin_id=s.admin_id and r.event_id=e.id)
    and not exists(select 1 from mt_private.mail_batches j where j.admin_id=s.admin_id and e.id=any(j.event_ids));
   if cardinality(ids)>0 then insert into mt_private.mail_batches(admin_id,event_ids,recipient) values(s.admin_id,ids,s.email); end if;
  end if;
 end loop;
 select decrypted_secret into key from vault.decrypted_secrets where name='MY_RESEND_API_KEY';
 if coalesce(key,'')='' then select decrypted_secret into key from vault.decrypted_secrets where name='resend_api_key'; end if;
 if coalesce(key,'')='' then return; end if;
 for b in select j.* from mt_private.mail_batches j join public.mt_activity_settings s on s.admin_id=j.admin_id join public.mt_admin_users a on a.user_id=j.admin_id where j.status='pending' and j.next_try<=now() and s.email_enabled and j.created_at>now()-interval '23 hours' and not ((s.quiet_start<s.quiet_end and hour>=s.quiet_start and hour<s.quiet_end) or (s.quiet_start>s.quiet_end and (hour>=s.quiet_start or hour<s.quiet_end))) loop
  select net.http_post(url:='https://api.resend.com/emails',headers:=jsonb_build_object('Authorization','Bearer '||key,'Content-Type','application/json','Idempotency-Key','mt-activity-'||b.id),body:=jsonb_build_object('from','Méthode Tee <hello@maisonyanna.com>','to',jsonb_build_array(b.recipient),'subject','Méthode Tee — activité à consulter','text',E'Bonjour,\n\nDe nouveaux éléments importants sont à consulter dans votre espace administrateur sécurisé.\n\nhttps://methode-tee.github.io/nutrition/admin.html#activite\n\nLes réglages de notification sont disponibles dans « Activité de mes Nutris ». Aucun détail personnel n’est envoyé par e-mail.'),timeout_milliseconds:=10000) into req;
  update mt_private.mail_batches set request_id=req,attempts=attempts+1,status='processing',next_try=now() where id=b.id;
 end loop;
 update mt_private.mail_batches set status='expired' where status='pending' and created_at<=now()-interval '23 hours';
 delete from public.mt_activity where occurred_at<now()-interval '180 days' or (kind='food_open' and occurred_at<now()-interval '30 days');
 delete from mt_private.mail_batches where created_at<now()-interval '30 days';
end $$;
revoke all on function mt_private.activity_tick() from public,anon,authenticated;
create function public.mt_activity_mail_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.mt_admin_users where user_id=auth.uid()) then raise exception 'Accès administrateur requis'; end if;
 return (select coalesce(jsonb_agg(x),'[]') from (select status,count(*) total,max(created_at) last_at from mt_private.mail_batches where admin_id=auth.uid() group by status) x);
end $$;
revoke all on function public.mt_activity_mail_status() from public,anon;
grant execute on function public.mt_activity_mail_status() to authenticated;
-- Trigger helpers also remain inaccessible via the Data API.
revoke all on all functions in schema mt_private from public,anon,authenticated;
select cron.schedule('mt-nutri-activity','*/5 * * * *','select mt_private.activity_tick()');
commit;
