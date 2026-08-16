# Patch — Auth cliente + Déconnexion

## Corrigé
- Corrige l’erreur `Can't find variable: slug` lorsqu’une ancienne session Supabase ne correspond à aucune fiche cliente.
- Si une mauvaise/ancienne session est détectée, l’app déconnecte proprement la session et réaffiche l’écran de connexion e-mail.
- Utilise `maybeSingle()` pour gérer proprement l’absence de fiche.
- Ajoute un bouton **Déconnexion** visible dans l’en-tête de l’espace cliente.
- La déconnexion coupe les rappels locaux, ferme la session Supabase puis recharge `index.html` sans conserver le hash du magic link.
- Incrémente le cache du service worker et supprime les anciens caches pour éviter que Safari/PWA conserve l’ancien `app.js`.

## Fichiers à remplacer
- `app.js`
- `index.html`
- `sw.js`

## Test rapide
1. Déployer les 3 fichiers.
2. Ouvrir `https://methode-tee.github.io/nutrition/index.html`.
3. Avec une ancienne session qui ne correspond pas à une cliente : l’écran de connexion doit s’afficher au lieu de `Fiche introuvable / slug`.
4. Se connecter avec l’e-mail d’une cliente existante.
5. Vérifier le bouton **Déconnexion** en haut à droite.
6. Appuyer dessus : retour à l’écran de connexion.

> Sur iPhone, après déploiement, un premier rafraîchissement peut être nécessaire le temps que le nouveau service worker prenne la main.
