# Méthode Tee — Performance Pro

## Nouvelles offres
- **Performance+ — 850 €/mois**
- **Private Performance — 1 500 €/mois**

Les anciennes offres restent intactes.

## Cockpit sportif ajouté
Pour les clients en parcours `performance` avec Performance+ ou Private Performance :

1. **Performance Board hebdomadaire**
   - priorité de la semaine ;
   - charge / contexte ;
   - séances clés et matchs ;
   - périodisation glucidique ;
   - repères protéines ;
   - hydratation / électrolytes ;
   - récupération ;
   - ajustements de planning.

2. **Stratégie match J-1 → J+1**
   - J-1 ;
   - pré-match ;
   - pendant / mi-temps ;
   - post-match immédiat ;
   - J+1.

3. **Voyage / hôtel / restaurant / cuisine culturelle**
   - plan hôtel / buffet ;
   - livraison et meal prep ;
   - plats culturels à préserver ;
   - protocole restaurant ;
   - aéroport / voyage ;
   - sécurité alimentaire.

4. **Micronutrition, biologie et composition corporelle**
   - données biologiques disponibles ;
   - priorités micronutritionnelles ;
   - validation médicale ;
   - objectif corporel et protocole de mesure.
   - l'application ne génère aucun diagnostic.

5. **Suppléments & antidopage**
   - produits actuels ;
   - statut food-first / lot testé / validation staff ;
   - traçabilité et notes.

6. **Coordination staff**
   - coach / préparateur ;
   - staff médical ;
   - kiné / récupération ;
   - notes de coordination.

7. **Maison Yanna**
   - dotation personnalisée ;
   - utilisation ;
   - stock / réassort ;
   - notes de prudence.

8. **Review hebdomadaire**
   - ce qui a marché ;
   - points à corriger ;
   - décisions semaine suivante.

## Private Performance
Private ajoute un bloc **Private Concierge** :
- chef / traiteur / relais local ;
- statut du prestataire ;
- meal prep ;
- livraison et conservation ;
- préparation des déplacements ;
- présence physique ponctuelle sur devis ;
- actions prioritaires à résoudre / anticiper.

## Suivi quotidien sportif enrichi
Pour Performance+ et Private :
- récupération ;
- courbatures ;
- disponibilité physique ;
- fatigue générale ;
- appétit ;
- charge ressentie ;
- hydratation estimée en litres ;
- énergie, sommeil, digestion et poids déjà présents.

## Technique
- Ajout de `mt-performance-pro.js` après `mt-professional-v6.js` dans `index.html` et `admin.html`.
- Les nouvelles données sont stockées dans `programme.athlete` : aucune nouvelle table Supabase n'est nécessaire si `programme` reste un champ JSON/JSONB.
- Rétro-compatible : les anciens dossiers clients sont normalisés automatiquement.
