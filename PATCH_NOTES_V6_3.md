# Méthode Tee — Patch V6.3 : Focus hebdomadaire

Ce patch ajoute dans chaque **Semaine** de la Timeline admin quatre contenus indépendants et archivés :

- 🌿 Pharmacopée / mélange de la semaine
- 🏃 Objectif mouvement
- 🌙 Rituel du soir renforcé
- ✦ Tip Tee spécial semaine

## Fonctionnement

Les champs sont stockés dans `programme.timeline.semaines[n]`. Ils ne s’écrasent donc pas quand on passe de S1 à S2/S3/S4.

Côté cliente, une carte **Semaine X — Focus personnalisé** apparaît automatiquement dans **Mon Programme** et n’affiche que les contenus de la semaine en cours.

## Installation

Remplacer uniquement :

- `mt-professional-v6.js`
- `sw.js`

Aucun SQL supplémentaire n’est nécessaire.
