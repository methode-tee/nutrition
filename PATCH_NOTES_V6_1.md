# Méthode Tee — Correctif V6.1 Repas

Correctifs inclus :
- ordre forcé des jours : Lundi → Mardi → Mercredi → Jeudi → Vendredi → Samedi → Dimanche ;
- le jour actuel est sélectionné automatiquement lorsqu'il existe ;
- texte du compteur clarifié : « X/4 moments validés aujourd’hui » ;
- sous-titre : « Semaine N · minimum X choix par moment » ;
- sauvegarde des choix repas renforcée : écriture Supabase immédiate et sérialisée ;
- filet de sécurité local : si le réseau coupe avant l’enregistrement, les choix restent sur l’appareil et sont resynchronisés à la réouverture ;
- cache Service Worker incrémenté pour forcer le chargement du nouveau JS.

Aucune migration SQL supplémentaire n'est nécessaire pour V6.1.

Fichiers à remplacer :
- mt-professional-v6.js
- sw.js
