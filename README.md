# Méthode Tee — App Nutrition Premium

Application web progressive pour le suivi nutrition personnalisé.

## Fichiers

| Fichier | Description |
|---|---|
| `index.html` | Application principale (espace client + admin) |
| `landing.html` | Page publique de présentation |
| `icon-192.PNG` | Icône de l'app (à conserver) |

## Déploiement GitHub Pages

1. Uploader les fichiers dans le repo `nutrition`
2. Settings → Pages → Branch: `main` → Save
3. L'app est accessible à `https://[username].github.io/nutrition/`

## Liens clients

Chaque cliente a un lien unique :
```
https://[username].github.io/nutrition/?client=prenom
```

## Admin

- Accès via le bouton ⚙️ en bas à droite (mode admin uniquement)
- Mot de passe requis à chaque session
- Connexion Supabase configurée par défaut

## Nouvelles fonctionnalités (v2)

- **Bilan de terrain interactif** — 10 questions → profil (nerveux, digestif, hormonal…) + plantes associées
- **Lexique botanique** — chaque plante cliquable, propriétés + contre-indications + produit Maison Yanna
- **Journal de cycle** — 4 phases menstruelles → suggestions alimentaires et phyto adaptées
- **Score de vitalité** — courbe hebdomadaire calculée depuis le suivi
- **Page renouvellement** — résumé transformation + offres disponibles (fin de programme)
- **Mode rituel matin** — vue plein écran épurée, sans navigation
- **Rapport PDF** — bilan complet générable depuis l'admin

## Stack technique

- HTML/CSS/JS vanilla (zéro dépendance sauf Supabase JS + Google Fonts)
- Supabase pour la persistance des données clients
- GitHub Pages pour l'hébergement

## Supabase

Table : `mt_clients`
Colonnes : `slug` (text, PK), `prenom` (text), `programme` (jsonb)

```sql
create table mt_clients (
  slug text primary key,
  prenom text,
  programme jsonb default '{}'
);
alter table mt_clients enable row level security;
create policy "Public read" on mt_clients for select using (true);
create policy "Public write" on mt_clients for all using (true);
```
