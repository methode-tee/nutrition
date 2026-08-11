# Méthode Tee — application privée sécurisée

Cette version transforme l’ancienne fiche accessible par lien en un véritable espace privé d’accompagnement.

## Parcours cliente

La navigation principale contient cinq espaces :

1. **Aujourd’hui** — message de Tee, objectif, priorités et rituel du jour.
2. **Mon plan** — nutrition, plantes, programme et plat signature.
3. **Mon suivi** — énergie, sommeil, digestion et indicateurs adaptés au profil.
4. **Progression** — photos, évolution, victoires et bilans.
5. **Tee** — messagerie directe.

Deux profils sont disponibles :

- **Équilibre** : stress, faim et satiété, confort corporel.
- **Performance** : récupération, courbatures, disponibilité physique.

## Fichiers principaux

- `index.html` : espace cliente sécurisé.
- `admin.html` : espace professionnel séparé.
- `app.js` : logique de l’application.
- `style.css` : identité visuelle et responsive.
- `translations.js` : interface FR/EN.
- `supabase-security.sql` : migration obligatoire de la base.
- `PATCH_NOTES.md` : procédure d’installation.

## Avant publication

Lire entièrement `PATCH_NOTES.md`, sauvegarder la base puis exécuter `supabase-security.sql`. L’application attend une authentification Supabase par e-mail et ne fonctionne plus avec les anciens liens publics `?client=...`.

La clé `anon` Supabase peut rester dans le navigateur. Ne jamais y placer une clé `service_role`.
