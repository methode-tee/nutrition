# Méthode Tee — Expérience par formule

Cette version différencie réellement les 5 niveaux d'accompagnement sans créer de nouvelle table Supabase.

- 120 € — Essentiel : cadre personnalisé.
- 240 € — Suivi : suivi hebdomadaire + journal visible des ajustements de Tee.
- 400 € — Signature : espace plus vivant, sélection Maison Yanna incluse, cockpit performance léger pour les sportifs.
- 850 € — Private : anticipation, plan proactif, signaux admin à surveiller, cockpit sportif complet si parcours Performance.
- 1 500 € — Private Performance+ : pilotage sportif complet + concierge / logistique / actions privées.

Nouvelles données JSONB utilisées :
- `programme.formule_prix_eur`
- `programme.tee_updates[]`
- `programme.proactive_plan`

Aucune nouvelle table, aucun cron et aucune Edge Function supplémentaire.

La sélection Maison Yanna reste limitée côté Supabase par le plafond invisible déjà en place :
- 400 € → 133 €
- 850 € → 283,33 €
- 1 500 € → 500 €
