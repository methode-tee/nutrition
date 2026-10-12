create function public.mt_admin_save_client(p_slug text,p_prenom text,p_email text,p_notes text,p_programme jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.mt_admin_users where user_id=auth.uid()) then raise exception 'Accès administrateur requis'; end if;
 insert into public.mt_clients(slug,prenom,client_email,admin_notes,programme) values(p_slug,p_prenom,p_email,p_notes,p_programme)
 on conflict(slug) do update set prenom=excluded.prenom,client_email=excluded.client_email,admin_notes=excluded.admin_notes,programme=excluded.programme;
end $$;
revoke all on function public.mt_admin_save_client(text,text,text,text,jsonb) from public,anon;
grant execute on function public.mt_admin_save_client(text,text,text,text,jsonb) to authenticated;
