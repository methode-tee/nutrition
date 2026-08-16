# PATCH PROFESSIONNEL V6 — Méthode Tee

Base : `nutrition-main 3.zip`

## Ce patch ajoute / corrige

1. **Sélection réelle des repas**
   - chaque ligne du champ Matin / Déjeuner / Collation / Dîner devient une proposition cliquable côté cliente ;
   - compteur par moment : S1 = 1 minimum, S2 = 2 minimum, S3 = 3 minimum, S4+ = 5 / toute la sélection ;
   - progression quotidienne Matin / Déjeuner / Collation / Soir ;
   - choix conservés dans Supabase.

2. **Menus conservés semaine par semaine**
   - S1, S2, S3, S4 ont chacun leurs propres jours ;
   - les anciens `programme.days` sont migrés automatiquement vers S1 ;
   - l’admin peut changer de semaine sans écraser les précédentes ;
   - les clientes peuvent relire les semaines passées en lecture seule.

3. **Semaine automatique**
   - le champ manuel « Semaine » est masqué ;
   - la semaine affichée est calculée depuis la date de début de la Timeline ;
   - la règle 1 → 2 → 3 → 5 suit cette semaine automatiquement.

4. **Bilan initial intégré — 65 questions**
   - les 65 éléments du questionnaire sont ajoutés à l’admin ;
   - bouton pour préremplir les Notes privées ;
   - bouton pour copier une synthèse ;
   - les réponses restent administrateur uniquement.

5. **Profil / Cycle conditionnel**
   - nouveaux champs : sexe/identité et statut du cycle ;
   - le module Cycle côté cliente n’apparaît que si `Cycle actif` ;
   - les questions hormonales du Bilan Terrain sont masquées sinon.

6. **Bilan Terrain et phyto plus prudents**
   - « Terrain AI » devient un bilan de repères, sans diagnostic ;
   - aucune recommandation de plante automatique à partir d’un symptôme ;
   - les produits restent sélectionnés manuellement par Tee ;
   - case « Sécurité phyto vérifiée » dans l’admin ;
   - modèles de protocoles réécrits comme bases à adapter, sans promesses thérapeutiques automatiques.

7. **Produits Maison Yanna**
   - statut : Déjà en possession / Recommandé par Tee / À découvrir ;
   - possibilité de masquer un produit sans le supprimer ;
   - « mis en avant » reste disponible.

8. **Supabase devient la source de vérité du suivi**
   - suivi quotidien, choix de repas, tâches, bilan terrain et cycle sont synchronisés ;
   - `localStorage` reste seulement un cache de secours pour certaines données ;
   - dates quotidiennes calculées en heure locale et non en UTC.

9. **PDF corrigé**
   - utilise le vrai programme courant ;
   - n’invente plus de victoires ;
   - indique « aucune victoire renseignée » si nécessaire.

10. **Sécurité d’affichage**
   - échappement des principaux contenus dynamiques (messages, menus, objectifs, produits, etc.) ;
   - l’interface Admin a été retirée de `index.html` : la cliente ne charge plus le panneau administrateur ;
   - `admin.html` reste la page professionnelle.

11. **Tableau “À regarder aujourd’hui”**
   - suivi absent depuis 2 jours ;
   - nouveaux messages ;
   - stress élevé sur 3 suivis ;
   - fin de semaine à préparer.

12. **Clôture / préparation de semaine**
   - bouton « Valider la semaine → préparer la suivante » ;
   - copie le menu de la semaine courante comme base de la suivante sans effacer l’ancienne ;
   - Tee adapte ensuite la nouvelle semaine avant sauvegarde.

## Installation

### A. GitHub
Remplacer / ajouter ces fichiers dans le dossier `nutrition` :

- `index.html`
- `admin.html`
- `app.js`
- `mt-professional-v6.js` **(nouveau)**
- `sw.js`
- `supabase-security.sql`

### B. Supabase — obligatoire une fois
Dans Supabase > SQL Editor, exécuter le contenu de :

`MIGRATION_V6.sql`

Sans cette migration, Supabase bloquera les nouvelles écritures clientes (`meal_selections`, `task_state`, `terrain_bilan`, `cycle`) par sécurité.

### C. Cache iPhone
Le Service Worker passe en `methode-tee-v6-professional`. Après mise en ligne :
1. ouvrir le site ;
2. actualiser une fois ;
3. si Safari garde une ancienne version, fermer l’onglet puis le rouvrir.

## Format des repas dans l’admin

Pour que les sélections fonctionnent comme prévu, mettre **une proposition par ligne** dans chacun des 4 moments. Idéalement 5 lignes :

```text
Kiwi
2 œufs
Pain complet + avocat
Gingembre
Apricot Bloom Tea
```

En S1 la cliente doit en sélectionner au moins 1 ; en S2 au moins 2 ; en S3 au moins 3 ; en S4 les 5.

## Compatibilité des anciennes clientes

Aucune suppression de données :
- leurs anciens menus deviennent automatiquement la Semaine 1 ;
- les nouveaux champs sont ajoutés avec des valeurs neutres ;
- les Notes privées restent dans `admin_notes` ;
- les anciens suivis restent lisibles.
