# Patch Méthode Tee V6.2 — Validation de semaine

Corrige le comportement du bouton de fin de semaine.

- Une semaine validée fait désormais avancer immédiatement la semaine active.
- Si S2/S3/S4 est déjà préparée, elle est conservée sans être écrasée.
- Si la semaine suivante est vide, la semaine actuelle est copiée comme base.
- La validation est sauvegardée automatiquement dans Supabase.
- La semaine en cours est déterminée par la date OU par les validations manuelles, selon ce qui est le plus avancé.
- Le bouton affiche clairement « Valider S1 → ouvrir S2 ».
- Nouveau cache service worker V6.2.

Aucun SQL supplémentaire n'est nécessaire.
