# Méthode Tee — Performance Pro V2

## Offres
- **Performance+ — 850 €/mois**
- **Private Performance — 1 500 €/mois**

Les offres existantes restent intactes.

## Le cap V2
La V1 ajoutait un cockpit sportif principalement descriptif. La V2 transforme le suivi en **système opérationnel structuré**.

### Commun à Performance+ et Private Performance
1. **Performance Board hebdomadaire**
   - priorité de la semaine ;
   - charge / contexte ;
   - périodisation glucidique ;
   - protéines ;
   - hydratation / électrolytes ;
   - récupération ;
   - ajustements.

2. **Calendrier performance jour par jour**
   - entraînement / match / récupération / repos / voyage / double séance ;
   - horaire ;
   - séance ;
   - repas et timing ;
   - hydratation ;
   - récupération ;
   - notes.

3. **Analyses de repas avec historique**
   - contexte ;
   - repas reçu/décrit ;
   - analyse ;
   - correction décidée ;
   - suivi ;
   - statut.

4. **Dossiers match complets**
   - date, adversaire, heure du coup d'envoi et réveil ;
   - voyage / lieu ;
   - H-6, H-4, H-2 ;
   - avant échauffement ;
   - mi-temps ;
   - 0–60 min post-match ;
   - repas post-match ;
   - J+1 ;
   - retours et ajustements.

5. **Hydratation individualisée**
   - poids pré/post séance ;
   - durée ;
   - boissons consommées ;
   - urines pendant séance si mesurées ;
   - estimation de la perte hydrique ;
   - estimation du taux de sudation ;
   - repère de réhydratation post-effort ;
   - conditions / électrolytes / notes.

6. **Micronutrition / biologie structurée**
   - marqueur ;
   - valeur / unité ;
   - référence laboratoire ;
   - statut ;
   - consigne médicale transmise ;
   - action nutritionnelle ;
   - date de contrôle.
   - Aucun diagnostic n'est généré par l'app.

7. **Historique de composition corporelle**
   - poids ;
   - masse grasse ;
   - masse musculaire ;
   - tour de taille ;
   - méthode ;
   - conditions de mesure ;
   - décision nutritionnelle.

8. **Journal suppléments & antidopage**
   - produit / marque ;
   - dose / fréquence ;
   - numéro de lot ;
   - preuve / certification ;
   - statut de décision ;
   - validation staff ;
   - date de dernière vérification.

9. **Coordination staff avec historique**
   - interlocuteur / rôle ;
   - sujet ;
   - information reçue ;
   - décision nutritionnelle ;
   - suivi / statut.

10. **Maison Yanna**
    - dotation ciblée ;
    - utilisation ;
    - stock / réassort ;
    - notes de sécurité.

11. **Reviews et tendances**
    - historique des reviews ;
    - énergie / récupération / digestion / appétit / sommeil ;
    - décision de la semaine suivante ;
    - tableau automatique des tendances des derniers check-ins.

12. **Suivi quotidien enrichi**
    - énergie, sommeil, digestion, poids ;
    - récupération, courbatures, disponibilité ;
    - fatigue générale ;
    - appétit ;
    - charge ressentie ;
    - hydratation estimée.

## Private Performance — étage Concierge
Private inclut tout Performance+ et ajoute un système opérationnel à distance :

1. **Dossiers voyages**
   - destination / dates ;
   - vol / transfert ;
   - hôtel ;
   - accès alimentaire ;
   - chef / traiteur ;
   - repas commandés ;
   - kit voyage ;
   - sécurité alimentaire ;
   - plan B ;
   - statut.

2. **Bibliothèque “Cuisine de chez lui”**
   - version habituelle ;
   - préparation à transmettre ;
   - version entraînement ;
   - version repos ;
   - place avant match ;
   - version récupération ;
   - portions / tolérance ;
   - validation par le joueur.

3. **Chef / traiteur / meal-prep**
   - prestataire ;
   - repas / quantités ;
   - instructions envoyées ;
   - livraison ;
   - conservation ;
   - retour du joueur ;
   - correction de la livraison suivante.

4. **File d'actions Private**
   - action ;
   - catégorie ;
   - responsable ;
   - échéance ;
   - priorité ;
   - statut : à faire / en cours / en attente / terminé ;
   - blocage / prochaine étape.

5. **Décisions rapides / situations réelles**
   - situation ;
   - décision donnée au joueur ;
   - raison ;
   - résultat / retour.

6. **Présence physique ponctuelle**
   - peut être planifiée dans le dossier ;
   - reste une mission séparée avec frais / devis.

## UX
- Plus aucun libellé client n'est figé sur “Tripoli” : la base sportive est dynamique.
- Performance+ reste déjà très poussé ; Private se différencie par la **logistique, l'anticipation et l'exécution**.
- Les écrans client affichent les informations structurées, mais pas les champs purement internes inutiles.

## Technique
- Extension dans `mt-performance-pro.js`.
- Données enregistrées dans `programme.athlete` (JSON/JSONB).
- **Aucune migration Supabase requise** tant que `programme` reste JSON/JSONB.
- Rétrocompatibilité avec les champs V1 : les anciens dossiers sont normalisés automatiquement.
