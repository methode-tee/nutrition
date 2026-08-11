# Patch Méthode Tee privée

## Corrections réalisées

- Connexion par lien sécurisé envoyé par e-mail ; les anciens liens `?client=...` ne donnent plus accès à une fiche.
- Accès administrateur vérifié par Supabase, sans mot de passe codé dans le navigateur.
- RLS activée : une cliente ne peut lire ou modifier que la fiche associée à son e-mail.
- Bucket photo rendu privé.
- Administration retirée du parcours visible de la cliente et conservée dans `admin.html`.
- Navigation ramenée à cinq entrées : Aujourd’hui, Mon plan, Mon suivi, Progression et Tee.
- Deux parcours configurables dans l’admin : Équilibre et Performance.
- Accueil reformulé comme prolongement quotidien de l’accompagnement.

## Installation obligatoire

1. Sauvegarder la base Supabase actuelle.
2. Exécuter `supabase-security.sql` dans l’éditeur SQL Supabase.
3. Activer l’authentification par e-mail dans Supabase.
4. Créer le compte de Tee dans Authentication > Users.
5. Ajouter son UUID dans `mt_admin_users` avec la commande commentée à la fin du fichier SQL.
6. Renseigner l’e-mail de connexion de chaque cliente depuis l’admin.
7. Remplacer les fichiers du projet puis tester avec un compte cliente distinct.

## Sécurité

La clé Supabase `anon` présente dans le JavaScript est publique par conception. La protection dépend de l’authentification et des règles RLS. Ne jamais placer une clé `service_role` dans le projet.

Avant d’utiliser l’application avec des données sensibles ou des photos, faire vérifier les règles Supabase, la politique de confidentialité, le consentement et les durées de conservation.
