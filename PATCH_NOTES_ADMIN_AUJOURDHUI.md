# Méthode Tee — Admin « Aujourd’hui »

Ajout d’une file d’actions quotidienne calculée automatiquement dans l’espace admin.

## Ce que l’admin voit
- 🔴 Priorité aujourd’hui
- 🟠 À suivre
- 🟡 Point prévu
- raisons détectées
- points à vérifier avant d’écrire
- boutons Voir le profil / Écrire / Ajuster le programme / Fait ✓

## Cadence par formule
- 120 € : 1 intervention proactive / semaine, cible interne 4 jours de présence / mois
- 240 € : 2 / semaine, cible 8 / mois
- 400 € : jusqu’à 4 / semaine selon contexte, cible 14 / mois
- 850 € : jusqu’à 6 / semaine, cible 22 / mois
- 1 500 € : accompagnement continu quand le contexte le nécessite

Les cibles sont privées : le client ne les voit jamais.

## Signaux exploités
- messages client non lus
- demande phyto en attente
- sélection Maison Yanna en attente
- suivi quotidien manquant / ancien
- énergie, sommeil, digestion, récupération, courbatures, disponibilité
- hydratation / repas non validés sur les derniers suivis
- calendrier sportif : entraînement, double séance, récupération, match, voyage
- match ou voyage du lendemain
- rendez-vous du jour
- onboarding d’un nouveau client

## Charge Supabase
Aucune nouvelle table, aucun cron, aucune nouvelle Edge Function.
La file est calculée dans le navigateur depuis la requête mt_clients déjà utilisée par l’admin.
Supabase reçoit seulement une lecture + une écriture lorsque Tee clique « Fait ✓ ».
L’historique est compact dans `programme.tee_presence.log` et limité aux 120 derniers jours / 240 entrées.
