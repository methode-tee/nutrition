# Méthode Tee — correctif des activités (version 8.52)

## Objectif

- Formules **Équilibre / Essentiel** (`programme.parcours !== "performance"`) :
  - check-in quotidien d’activité : marche, renforcement, Pilates, salle/gym, running, piscine/natation, vélo, yoga, mobilité, danse, autre ; durée et intensité ;
  - programmation des mêmes activités dans le planning de la semaine, sans champs match/compétition ni déplacement sportif ;
  - historique des activités quotidiennes et affichage administrateur.
- Formules **Performance** (`programme.parcours === "performance"`) : maintien du check-in sportif, du planning, et des champs match/déplacement.
- Les enregistrements continuent d’utiliser `programme.suivi` et `programme.client_sport_plans` dans Supabase : pas de nouvelle table.
- Les sauvegardes client sont sérialisées pour réduire les conflits check-in/planning et vérifient qu’une ligne est effectivement enregistrée.

## Application en production

**Attention** : les sources fournies par l'utilisatrice datent du 11 octobre 2026. Le site GitHub a peut-être évolué depuis. Ne pas remplacer `index.html` ou `sw.js` par des copies anciennes.

1. Sur la branche actuelle du site, fusionner `correctif-activites.patch` et contrôler les éventuels conflits.
2. Sinon, rapprocher le fichier `mt-checkin-v851.js` de sa version actuelle avant remplacement : ne pas écraser des changements plus récents.
3. Dans l'index courant, utiliser `<script src="./mt-checkin-v851.js?v=852-activity"></script>` pour purger les caches de script.
4. Modifier uniquement le nom de la constante `CACHE` dans le service worker (`sw.js`) pour invalider les anciennes versions hors ligne ; ne pas remplacer le reste du fichier actuel.
5. Déployer GitHub Pages, puis contrôler la sauvegarde depuis un vrai compte client non-Performance et depuis un compte Performance.

## Vérifications réalisées

- `node --check` sur le JS : OK.
- Navigation navigateur Chromium simulée : Christiane (`parcours=equilibre`) voit marche, Pilates, piscine, etc. ; pas de match/compétition. Test du check-in Pilates 35 minutes et planification piscine 45 minutes : valeurs sauvegardées dans un simulateur Supabase.
- Fiston (`parcours=performance`) garde match, déplacement et la sauvegarde du planning sportif.
- L'autorisation existante Supabase autorise `client_sport_plans` dans les modifications du programme ; la protection des autres clés reste en place.

**Statut** : correctif préparé et testé localement ; **non déployé**, car le dépôt GitHub Méthode Tee n'est pas exposé dans la connexion GitHub de cette conversation.
