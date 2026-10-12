# Activité de mes Nutris

La rubrique est disponible dans l’admin, via le bouton du même nom en haut de page.
Les événements confirmés par Supabase sont horodatés en Europe/Paris. Ils comprennent les check-ins, modifications de choix alimentaires (libellés figés, avant/après), difficultés et absences attendues. Les événements historiques sont explicitement signalés sans inventer leur heure de réception. Filtre par client et type, détails, accès à la fiche, compteurs non lus par administrateur, pagination et lecture individuelle ou des événements affichés.

La cadence est réglable par client (1–30 jours, désactivation possible). Valeurs initiales selon formule : 7, 4, 3, 2 ou 1 jours. Clients actifs uniquement. Une alerte par période sans réponse ; une nouvelle réponse permet une nouvelle période. Contrôle serveur toutes les cinq minutes même lorsque l’admin est fermé.

Les ouvertures de la page alimentaire exigent un accord facultatif, désactivé par défaut. Une ouverture par jour maximum, aucune durée, URL, adresse IP ou information d’appareil enregistrée dans le journal. Le retrait efface les ouvertures. Rétention : ouvertures 30 jours, autres événements 180 jours. Les journaux techniques du fournisseur d’hébergement restent distincts.

Les notifications importantes (difficultés et absences) sont regroupées. Par défaut : une notification au maximum toutes les 24 heures, silence 20h–8h Paris. Intervalle réglable entre 6 et 168 heures. Les événements déjà lus, historiques ou déjà inclus dans un envoi sont exclus. Les e-mails vont exclusivement à l’adresse du compte admin ; aucune identité cliente, repas, note ou mesure n’y figure. Acceptation fournisseur suivie, reprises limitées, clé d’idempotence constante, expiration des reprises avant 24 heures. « Accepté » ne signifie pas livré dans la boîte de réception.

## Sécurité et compatibilité

RLS sur toutes les nouvelles tables publiques. Aucun accès client au journal, aux lectures admin ou aux réglages. Consentement modifiable uniquement pour sa propre fiche via une fonction vérifiant la session. Traitements privilégiés internes dans un schéma privé, fonctions avec search_path fixé, aucune clé secrète dans le navigateur. Deux RPC vérifiant mt_admin_users sont déployées pour la lecture et sauvegarde des notes privées. La restriction SELECT reste active : les notes privées ne sont plus accessibles aux clients. Le frontend publié utilise ces RPC pour la lecture et la sauvegarde des fiches administrateur. Les autres fonctions et le parcours client restent accessibles. Les contrôles existants du programme et des plafonds Shopify restent actifs. Les réponses API externes ne sont plus mises en cache par le service worker.

Migrations de production : nutri_activity_feed, nutri_activity_privacy_hardening, nutri_activity_worker_alias_fix, nutri_activity_admin_save_permissions. Sources dans supabase/. L’ordre des fichiers est activity.sql, activity_hardening.sql, activity_worker_fix.sql, activity_admin_save.sql. Ne pas les rejouer sur la production déjà migrée.

## Vérifications du 12 octobre 2026

Tests transactionnels sur Supabase avec rôles client et administrateur ; toutes les modifications de test annulées : isolation RLS, refus des notes privées et RPC admin aux clients, accord/retrait, déduplication, capture check-in et difficulté, capture des choix, absence sans doublon, compteurs et lectures, sauvegarde admin conservée. 14 check-ins et 90 sélections historiques importés. Deux absences détectées réellement, une notification regroupée acceptée par le fournisseur en une tentative.

Interface vérifiée dans le navigateur intégré avec données fictives : détails de choix, texte HTML neutralisé, compteur après lecture, filtre difficultés, sauvegarde réglages, consentement désactivé/activation/retrait. Les fichiers tests/activity-*-preview.html permettent de reproduire les vérifications sans compte réel. tests/activity-ui.cjs est prévu pour Playwright avec Chromium installé. Son lancement direct était bloqué par le confinement macOS dans l’environnement Codex ; la vérification interactive utilise le navigateur intégré. La session complète par lien magique d’un vrai client n’a pas été utilisée.

Les conseillers Supabase ont été vérifiés. Les RPC privilégiées intentionnelles possèdent leurs contrôles d’autorisation et ont été testées avec un rôle non autorisé. La table interne de mails n’accorde aucun accès client. Des avertissements préexistants persistent hors de cette fonctionnalité : chemin de recherche de mt_shopify_selection_value, pg_net installé dans public, fonction de calcul de sélection privilégiée et protection des mots de passe compromis désactivée. Voir https://supabase.com/docs/guides/database/database-linter et https://supabase.com/docs/guides/auth/password-security.

## État final de publication

Supabase : installé, tâche cron opérationnelle, acceptation du premier e-mail confirmée. Interface publiée le 12 octobre 2026 dans le commit 3e4a0f2b01ce5c11a889846346c78b323f92393b. GitHub Pages : déploiement réussi, exécution https://github.com/methode-tee/nutrition/actions/runs/38282083254. Les cinq fichiers app.js, admin.html, index.html, mt-activity.js et sw.js récupérés sur le site public correspondent octet pour octet aux fichiers testés. Publication réalisée par l’interface GitHub après connexion de la propriétaire, les connexions API/Git refusant l’écriture.

La publication des sources SQL dans le dépôt public a été autorisée explicitement après refus du contrôle automatique. Vérification : aucun secret ni donnée cliente dans ces fichiers ; les clés restent dans le coffre Supabase. La restriction des notes privées a été conservée.
