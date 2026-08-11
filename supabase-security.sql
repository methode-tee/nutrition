-- Méthode Tee privée — migration de sécurité obligatoire
alter table public.mt_clients add column if not exists client_email text;
alter table public.mt_clients add column if not exists admin_notes text not null default '';
update public.mt_clients set admin_notes=coalesce(programme->>'notes_priv','') where coalesce(admin_notes,'')='';
update public.mt_clients set programme=programme-'notes_priv' where programme ? 'notes_priv';
create unique index if not exists mt_clients_client_email_unique
  on public.mt_clients (lower(client_email)) where client_email is not null;

create table if not exists public.mt_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.mt_clients enable row level security;
alter table public.mt_admin_users enable row level security;

drop policy if exists "client reads own profile" on public.mt_clients;
drop policy if exists "client updates own profile" on public.mt_clients;
drop policy if exists "admins manage clients" on public.mt_clients;
drop policy if exists "admin reads own role" on public.mt_admin_users;

create policy "client reads own profile" on public.mt_clients
for select to authenticated
using (lower(client_email) = lower(coalesce(auth.jwt()->>'email','')));

create policy "client updates own profile" on public.mt_clients
for update to authenticated
using (lower(client_email) = lower(coalesce(auth.jwt()->>'email','')))
with check (lower(client_email) = lower(coalesce(auth.jwt()->>'email','')));

create policy "admins manage clients" on public.mt_clients
for all to authenticated
using (exists(select 1 from public.mt_admin_users a where a.user_id=auth.uid()))
with check (exists(select 1 from public.mt_admin_users a where a.user_id=auth.uid()));

create policy "admin reads own role" on public.mt_admin_users
for select to authenticated using (user_id=auth.uid());

create or replace function public.mt_protect_client_identity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.mt_admin_users a where a.user_id=auth.uid()) then
    if new.slug is distinct from old.slug
      or new.prenom is distinct from old.prenom
      or new.client_email is distinct from old.client_email
      or new.admin_notes is distinct from old.admin_notes
      or (new.programme - array['suivi','photos','phyto_demande','selection','messages']::text[])
         is distinct from
         (old.programme - array['suivi','photos','phyto_demande','selection','messages']::text[]) then
      raise exception 'Modification non autorisée';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mt_clients_protect_identity on public.mt_clients;
create trigger mt_clients_protect_identity before update on public.mt_clients
for each row execute function public.mt_protect_client_identity();

insert into storage.buckets (id,name,public)
values ('mt-photos','mt-photos',false)
on conflict (id) do update set public=false;

drop policy if exists "authenticated photo read" on storage.objects;
drop policy if exists "authenticated photo upload" on storage.objects;
create policy "authenticated photo read" on storage.objects for select to authenticated
using (bucket_id='mt-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.mt_admin_users a where a.user_id=auth.uid())));
create policy "authenticated photo upload" on storage.objects for insert to authenticated
with check (bucket_id='mt-photos' and (storage.foldername(name))[1]=auth.uid()::text);

-- Après avoir créé ton compte admin, remplace la valeur ci-dessous :
-- insert into public.mt_admin_users(user_id) values ('UUID_DE_TEE');
