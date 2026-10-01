# Parcours utilisateur et critères d'acceptation

Ce document est la référence des tests de non-régression end-to-end (Playwright). Chaque parcours correspond à un `test.describe` portant son identifiant (V1, A12…), et chaque critère à un `test` ou à un `expect`.

- Lancer : `npm run test:e2e` (prérequis : `npm run dev:infra`). Débogage : `npm run test:e2e:ui`.
- Données : `npm run seed` est rejoué au démarrage, puis après chaque spec qui modifie des données (`test.afterAll(reseed)`).
- Projets : `desktop` (tous les parcours) et `mobile` (Pixel 7 : navigation et galerie).

## Visiteur anonyme (`public/`)

| # | Parcours | Critères d'acceptation | Spec |
|---|---|---|---|
| V1 | Accueil | Hero : titre et sous-titre de la config, CTA vers `#galleries`. Section À propos (image, titre, texte, lien Contact). Portfolio = albums publics et portfolio, avec nombre de photos et couverture. Section Albums : publics cliquables, « Protégé par mot de passe », « Accès sur invitation » non cliquable, pas de doublon avec le portfolio. CTA du bas → `/contact` | `home` |
| V2 | Footer | Nom, description, Accueil/Contact, seuls les réseaux renseignés, `mailto:`, mentions | `home` |
| V3 | Navigation desktop | Accueil, Galerie (défile jusqu'à `#albums`, y compris depuis une autre page), Contact, logo → accueil. Pas de lien Admin si anonyme | `navigation` |
| V4 | Navigation mobile | Le burger ouvre le menu, un lien navigue et le referme, Galerie défile jusqu'aux albums | `navigation` |
| V5 | Galerie | Titre, date, nombre de photos, description. Ordre `sort_order`. Miniatures en JPEG chargées. Retour aux galeries | `gallery` |
| V6 | Aperçu | Le clic ouvre l'original en lightbox, → passe à la suivante, Échap ferme | `gallery` |
| V7 | Sélection | Cocher et décocher, compteur, Tout sélectionner/désélectionner, Annuler. Le ZIP de la sélection contient exactement les photos choisies | `download` |
| V8 | Tout télécharger | ZIP des 40 photos avec leurs noms d'origine | `download` |
| V9 | Photo unitaire | Bouton au survol → JPEG nommé `IMG_01.jpg` | `download` |
| V10 | Album non téléchargeable | Ni cases, ni boutons de téléchargement, texte d'aide adapté. ZIP de l'album en 403 | `download` |
| V11 | Album vide | État vide, aucune action | `gallery` |
| V12 | Lien invalide | « Album introuvable » et retour à l'accueil | `gallery` |
| V13 | Album privé avec mot de passe | Modale, Annuler. Mauvais mot de passe → erreur. Bon mot de passe → galerie. Espaces ignorés, Entrée valide | `private-album` |
| V14 | Couverture personnalisée | La carte utilise `/api/albums/:id/cover` | `home` |
| V15 | Orientation EXIF | Les miniatures EXIF 1/3/6/8 sont en portrait | `gallery` |
| V16 | Contact | Titre, email et fond de la config. Validation (champs requis, email). Confirmation après envoi, et le message arrive dans l'admin. L'API répond 400 sur un email invalide | `contact` |

## Visiteur connecté via Google (`visitor/`)

| # | Parcours | Critères d'acceptation |
|---|---|---|
| U1 | Mes albums | Un email autorisé voit « Mes albums » (Famille Martin) et l'ouvre. Un autre email ne voit pas la section |
| U2 | Copier le lien | Bouton visible et presse-papiers correct pour un email autorisé, absent sinon |
| U3 | Déconnexion | « × » fait disparaître la section, puis `/api/albums/my` répond 401 |
| U4 | Pas d'admin | Pas de lien Admin, `/admin` → login, API admin en 403 |

## Administrateur (`admin/`)

| # | Parcours | Critères d'acceptation | Spec |
|---|---|---|---|
| A1 | Protection | Sans session, `/admin/*` → `/admin/login` (nom du site, « Espace administration ») | `auth` |
| A2 | Session | `/admin` → albums. Email dans le header, badge des messages non lus, stockage. Voir le site. Le login redirige un admin connecté. Menu | `auth` |
| A3 | Déconnexion | Retour au login, `/admin` redemande la connexion | `auth` |
| A4 | Liste des albums | 9 albums, nombre de photos, Public/Privé, liens vers les photos | `albums` |
| A5 | Créer un album | Nom requis. Options (public, téléchargeable, portfolio). Mot de passe utilisable. Emails normalisés. Bonne section de l'accueil | `albums` |
| A6 | Modifier un album | Renommer et passer en portfolio. La modale reprend les valeurs existantes | `albums` |
| A7 | Couverture indépendante | Upload → aperçu, `cover_url`, carte de l'accueil | `albums` |
| A8 | Copier le lien | Presse-papiers = `/share/<token>` | `albums` |
| A9 | Régénérer le lien | Confirmation. Ancien lien → introuvable, nouveau copié et fonctionnel | `albums` |
| A10 | Supprimer un album | Confirmation ou annulation. Liste, lien, original et miniature en 404 | `albums` |
| A11 | Photos d'un album | Nom, description, compteur, ordre. État vide. Album inexistant. Fil d'Ariane | `photos` |
| A12 | Upload | JPEG ajouté avec miniature. EXIF 6 → miniature en portrait. HEIC → JPEG 1280×854 | `photos` |
| A13 | Fichier refusé | `.txt` listé dans `skipped`, avertissement, rien d'ajouté | `photos` |
| A14 | Couverture depuis une photo | Tag « Couverture » (seed puis changement), carte du portfolio mise à jour | `photos` |
| A15 | Réordonner | Le drag & drop persiste après rechargement et se voit sur la galerie publique | `photos` |
| A16 | Lien de téléchargement | Presse-papiers = `/api/photos/download/<token>`, qui renvoie une pièce jointe | `photos` |
| A17 | Supprimer une photo | Confirmation, compteur décrémenté, original en 404 | `photos` |
| A18 | Messages | Ordre, statuts et compteurs. Lire → tiroir complet et marqué lu (badges mis à jour). Clic sur une ligne. Suppression depuis le tiroir et depuis la table | `messages` |
| A19 | Identité | Nom du site (sider, header public, login), email de contact, footer | `settings` |
| A20 | Apparence | Thème clair, couleur principale (appliquée aux cases de sélection), police, image hero | `settings` |
| A21 | Contenu | Titre du hero, titre de la page contact. Bio vidée → section À propos masquée | `settings` |
| A22 | Réseaux | `facebook.com/…` → lien `https://` dans le footer | `settings` |
| A23 | Fond contact | Couleur et image appliquées au panneau de `/contact` | `settings` |
| A24 | Logo | Upload → logo dans les headers public et admin (PNG servi) | `settings` |
| A25 | Stockage | Espace utilisé (Mo), limite de 10 Go et message explicatif | `settings` |
| A26 | Mot de passe admin | Mauvais mot de passe actuel, confirmation différente (sans appel API). Succès → anciennes sessions en 401, seul le nouveau mot de passe fonctionne | `security` |

## Contrat API (`api/contract.spec.ts`)

| # | Critères d'acceptation |
|---|---|
| S1 | Les 20 routes admin répondent 401 sans session |
| S2 | Les mêmes routes répondent 403 avec une session visiteur. Un JWT falsifié → 401 |
| S3 | `PUT /api/config` ignore les clés inconnues. Un type d'asset inconnu → 400 |
| S4 | `/api/health` ok, deep link du SPA servi, route API inconnue → 404 |
| S5 | Une photo supprimée n'est plus servie. Régénérer un token invalide l'ancien. Le réordonnancement ignore les photos d'un autre album |

## Bugs connus (`test.fail`)

Ces tests décrivent le comportement **attendu**. Tant que le bug existe, ils échouent et la suite reste verte. Une fois le bug corrigé, Playwright les signale en « passed unexpectedly » : il faut alors retirer la ligne `test.fail(...)`.

| Test | Bug | Constat |
|---|---|---|
| A6 · `albums` | Modifier un album protégé sans toucher au mot de passe **supprime** le mot de passe | La modale envoie `password: ""`. Après l'édition, `/unlock` répond 400 « pas de mot de passe » |
| A21 · `settings` | Vider la bio ne masque pas la section À propos | L'éditeur enregistre `<p></p>` |
| A26 · `security` | Mot de passe de 6 ou 7 caractères accepté par le formulaire | L'API exige 8 caractères et l'erreur affichée est « Mot de passe actuel incorrect » |
| U3 · `my-albums` | Une session visiteur expirée redirige vers `/admin/login` | Intercepteur 401 global dans `api/client.ts` |
| V13 · `private-album` | `/unlock` sans body → 500 | Pas de schéma de validation |
| V13 · `private-album` | Pas de rate limit sur `/unlock` | 12 essais faux → 12 × 401 |
| Sécurité · `contract` | `/share/:token` expose `password_hash` et `allowed_emails` | `SELECT *` |
| Sécurité · `contract` | Photo d'un album non téléchargeable téléchargeable via `/photos/download/:token` | 200 |
| Sécurité · `contract` | Idem via `/photos/download-zip` | 200 |

Non testé : `apps/web/src/pages/public/MyAlbumsPage.tsx` n'est branchée sur aucune route et utilise l'URL obsolète `/uploads/...`. C'est du code mort.

## Hors périmètre
- **Bouton Google Sign-In** : non automatisable. Les sessions sont créées via l'API (admin) ou par un JWT signé (visiteur), et le script Google est bloqué dans les tests.
- **Limite de stockage atteinte (413)** : demanderait de modifier `STORAGE_LIMIT_GB` pendant les tests.
