# Méthode Tee — V851 · Check-in Nutri & suivi Tee

## Côté Nutri
Le suivi quotidien devient court et exploitable :
- sommeil : durée + qualité /10
- énergie générale /10
- faim
- digestion
- hydratation en litres
- récupération
- adhérence à la journée alimentaire
- note facultative
- poids : proposé au maximum 1 fois tous les 7 jours

Pour les profils sportifs / `parcours: performance` :
- jambes : légères / normales / lourdes / très lourdes
- séance du jour : oui/non
- type de séance
- durée
- intensité ressentie /10
- énergie pendant la séance /10
- récupération juste après
- douleur/gêne + zone
- planning sportif hebdomadaire renseigné par le Nutri : date, heure, type, durée, intensité, match/compétition, déplacement, note

Les champs sportifs sont masqués pour les profils non sportifs.

## Côté Tee / admin
- le dernier check-in remonte dans la fiche client avec les nouvelles données
- le bloc global distingue « check-in aujourd’hui » et « sans check-in aujourd’hui » sans faire de cette absence une alerte automatique
- « Aujourd’hui » utilise une fraîcheur liée à la formule :
  - 120 € : 7 jours
  - 240 € : 4 jours
  - 400 € : 3 jours
  - 900 € : 2 jours
  - 1 500 € : 1 jour
- le libellé devient « Aucun point de suivi récent renseigné »
- le bouton d’intervention devient « Point Tee ✓ » ; ce point reste distinct du check-in du Nutri et est stocké dans `programme.tee_presence.log` avec `kind: tee_point`
- le planning sportif renseigné par le Nutri alimente aussi les signaux de la file « Aujourd’hui »

## Compatibilité
Aucune nouvelle table Supabase et aucune migration SQL.
Les données restent dans le JSON `programme` de `mt_clients` :
- `programme.suivi[YYYY-MM-DD]`
- `programme.client_sport_plans[YYYY-MM-DD]`
- `programme.tee_presence.log`

Les anciennes clés /5 (`energie`, `sommeil`, `digestion`, `recuperation`, `courbatures`) sont conservées/produites pour ne pas casser les cartes et tendances existantes.

## Formules
Le niveau intermédiaire est harmonisé à **900 €** dans les fichiers concernés :
120 € / 240 € / 400 € / 900 € / 1 500 €.
