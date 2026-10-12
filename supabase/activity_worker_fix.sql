create or replace function mt_private.activity_tick() returns void language plpgsql security definer set search_path='' as $$
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
 for b in select j.* from mt_private.mail_batches j join public.mt_activity_settings pref on pref.admin_id=j.admin_id join public.mt_admin_users a on a.user_id=j.admin_id where j.status='pending' and j.next_try<=now() and pref.email_enabled and j.created_at>now()-interval '23 hours' and not ((pref.quiet_start<pref.quiet_end and hour>=pref.quiet_start and hour<pref.quiet_end) or (pref.quiet_start>pref.quiet_end and (hour>=pref.quiet_start or hour<pref.quiet_end))) loop
  select net.http_post(url:='https://api.resend.com/emails',headers:=jsonb_build_object('Authorization','Bearer '||key,'Content-Type','application/json','Idempotency-Key','mt-activity-'||b.id),body:=jsonb_build_object('from','Méthode Tee <hello@maisonyanna.com>','to',jsonb_build_array(b.recipient),'subject','Méthode Tee — activité à consulter','text',E'Bonjour,\n\nDe nouveaux éléments importants sont à consulter dans votre espace administrateur sécurisé.\n\nhttps://methode-tee.github.io/nutrition/admin.html#activite\n\nLes réglages de notification sont disponibles dans « Activité de mes Nutris ». Aucun détail personnel n’est envoyé par e-mail.'),timeout_milliseconds:=10000) into req;
  update mt_private.mail_batches set request_id=req,attempts=attempts+1,status='processing',next_try=now() where id=b.id;
 end loop;
 update mt_private.mail_batches set status='expired' where status='pending' and created_at<=now()-interval '23 hours';
 delete from public.mt_activity where occurred_at<now()-interval '180 days' or (kind='food_open' and occurred_at<now()-interval '30 days');
 delete from mt_private.mail_batches where created_at<now()-interval '30 days';
end $$;
