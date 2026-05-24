# Méthode Tee — Base stable index(4) + V4 Premium

Cette version part de la base `index(4).html` qui fonctionnait déjà, puis ajoute les fonctionnalités premium sans changer l’identité visuelle principale.

## Fichiers à uploader à la racine GitHub

- `index.html` : espace cliente
- `admin.html` : accès admin séparé
- `landing.html` : page d’entrée simple
- `style.css` : CSS extrait du fichier stable
- `app.js` : logique extraite + extensions V4
- `sw.js` : PWA/offline cache
- `manifest.json` : installation iPhone/PWA
- `README.md`

Garde aussi ton `icon-192.PNG` déjà présent.

## Nouveautés ajoutées

- admin séparé via `admin.html`
- vraie base offline queue localStorage + flush Supabase
- upload photos déjà conservé depuis la base stable
- génération PDF luxe automatique
- IA terrain phyto avancée
- journal de cycle
- lexique botanique
- scoring intelligent hebdomadaire
- recommandations Maison Yanna
- renouvellement intelligent déjà intégré dans la base
- PWA iPhone avec manifest + service worker
- design conservé depuis la base stable

## URL

Client :
`https://methode-tee.github.io/nutrition/?client=abdel`

Admin :
`https://methode-tee.github.io/nutrition/admin.html`


## Langues FR / EN

Le fichier `translations.js` ajoute un switch automatique FR / EN.
Il est chargé sur `index.html` et `admin.html`.

Aucun dossier nécessaire : tous les fichiers restent à la racine.


## Correctif FR/EN

- Switch langue déplacé dans le header, avant l’avatar, pour ne plus couvrir la lettre du client.
- Traduction élargie des pages : accueil, repas, soins, signature, transformation, programme, suivi, cycle, terrain, messages, placard et admin.
- Les contenus personnalisés saisis par la coach dans Supabase ne peuvent pas être traduits parfaitement sans versions bilingues FR/EN dans les données.


# MÉTHODE TEE V5 — INTERNATIONAL PREMIUM

## Nouveautés V5

### Architecture bilingue professionnelle
Chaque contenu important peut maintenant exister en :
- version française (_fr)
- version anglaise (_en)

Exemple :
- ritual_text_fr
- ritual_text_en
- coach_note_fr
- coach_note_en
- meals_fr
- meals_en

L’application détecte automatiquement :
- la langue choisie
- la disponibilité du contenu
- et applique un fallback intelligent.

Si EN est vide :
→ FR s’affiche automatiquement.

---

## Fonctionnement international

### Interface système
100 % bilingue :
- navigation
- menus
- widgets
- dashboard
- admin
- terrain
- cycle
- report
- onboarding
- messages
- notifications

### Contenu coach
Le coach peut écrire :
- uniquement FR
- ou FR + EN

---

## V5 Premium Features

### Sync offline avancée
- cache local
- retry automatique
- file d’attente sync
- mode offline iPhone

### PDF luxe automatique
- bilan premium
- photos avant/après
- score vitalité
- courbes
- conseils phyto
- signature Maison Yanna

### IA Terrain Phyto V5
- profil digestif
- nerveux
- inflammatoire
- hormonal
- surcharge hépatique
- fatigue adaptative

### Dashboard Coach Premium
- analytics
- clientes actives
- taux engagement
- progression moyenne
- score adherence

### Notifications PWA natives iPhone
- rappel hydratation
- infusion
- check-in
- repas
- renouvellement

### Realtime
- messagerie instantanée
- sync Supabase
- suivi live

### Upload photos
- avant/après
- stockage Supabase
- galerie progression

---

## Structure V5

index.html
admin.html
landing.html
style.css
app.js
translations.js
terrain.js
cycle.js
realtime.js
tracking.js
pdf.js
offline.js
analytics.js
sw.js
manifest.json

---

## Conseillé pour production

### Supabase
Créer :
- clients
- tracking
- rituals
- meals
- messages
- progress_photos
- subscriptions
- translations

### Storage buckets
- before-after
- pdf-reports
- client-assets

---

## Vision

Méthode Tee V5 devient :
- une vraie plateforme internationale wellness
- nutrition + phytothérapie + terrain
- expérience premium type SaaS wellness privé
- multilingue FR/EN
