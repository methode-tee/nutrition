-- Méthode Tee — Migration V6 (à exécuter UNE FOIS dans Supabase > SQL Editor)
-- Cette migration ne supprime aucune donnée.

create or replace function public.mt_protect_client_identity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.mt_admin_users a where a.user_id=auth.uid()) then
    if new.slug is distinct from old.slug
      or new.prenom is distinct from old.prenom
      or new.client_email is distinct from old.client_email
      or new.admin_notes is distinct from old.admin_notes
      or (new.programme - array[
            'suivi','photos','phyto_demande','selection','messages',
            'meal_selections','task_state','terrain_bilan','cycle'
          ]::text[])
         is distinct from
         (old.programme - array[
            'suivi','photos','phyto_demande','selection','messages',
            'meal_selections','task_state','terrain_bilan','cycle'
          ]::text[]) then
      raise exception 'Modification non autorisée';
    end if;
  end if;
  return new;
end $$;

create index if not exists mt_clients_status_idx
  on public.mt_clients ((programme->>'statut'));
