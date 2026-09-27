# Méthode Tee — Patch V6.4 · Validation de semaine

## Correction
La validation manuelle d'une semaine ouvre désormais immédiatement la semaine suivante, même si certaines semaines précédentes ont avancé automatiquement avec la date et n'ont pas d'entrée `week_reviews` historique.

Exemple corrigé : dimanche en S6 → `Valider S6 → ouvrir S7` ouvre S7 immédiatement, sans attendre le lundi.

## Fichiers à remplacer
- `mt-professional-v6.js`
- `sw.js`

Aucune migration SQL nécessaire.
