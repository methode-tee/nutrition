# V6.5 — Validation de semaine directe

Correctif basé sur `nutrition-e5d774f73f2be04de2ce124ab6279d5e8bb614cb.zip`.

## Cause corrigée
Le bouton `Valider Sx → ouvrir Sx+1` appelait `saveClient()`, donc la validation dépendait de la sauvegarde complète de tous les champs de l'admin. Une erreur ou un champ bloquant ailleurs pouvait empêcher `week_reviews` d'être persisté sans rendre le problème évident.

## Nouveau comportement
- validation S6 enregistrée directement dans Supabase ;
- S7 déjà préparée conservée telle quelle ;
- les trous historiques dans `week_reviews` ne bloquent plus l'avancement ;
- si Supabase refuse l'écriture, un message d'erreur explicite apparaît au lieu de donner l'impression que le bouton n'a rien fait ;
- cache service worker bumpé.

Aucun SQL à exécuter.
