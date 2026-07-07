# Manuel utilisateur — PhotoGal

## Table des matières

- [Site public](#site-public)
  - [Page d'accueil](#page-daccueil)
  - [Galerie d'un album](#galerie-dun-album)
  - [Page contact](#page-contact)
  - [Connexion visiteur](#connexion-visiteur)
- [Espace administration](#espace-administration)
  - [Connexion admin](#connexion-admin)
  - [Albums](#albums)
  - [Photos d'un album](#photos-dun-album)
  - [Messages](#messages)
  - [Paramètres](#paramètres)

---

## Site public

### Page d'accueil

La page d'accueil est composée de cinq sections verticales.

#### Section Hero
Plein écran avec un grand titre, un sous-titre et un bouton d'appel à l'action. Si une image de fond est définie dans les paramètres, elle s'affiche avec un voile sombre. Sinon un dégradé est utilisé. Tous ces textes sont configurables dans les paramètres.

#### Section À propos
S'affiche uniquement si un texte de présentation est renseigné dans les paramètres. Contient une photo optionnelle (portrait), un titre, un texte de biographie et un bouton vers la page contact.

#### Section Portfolio
Grille des albums marqués **Portfolio** (visibles publiquement). Chaque vignette affiche la couverture de l'album, son nom et un bouton de réservation. Le titre de la section et le texte du bouton sont configurables dans les paramètres.

Un clic sur une vignette ouvre la galerie de l'album.

#### Section Albums
Grille de tous les albums **non-Portfolio** (publics et privés).

- **Album public** : clic direct vers la galerie
- **Album privé avec mot de passe** : clic ouvre un modal de saisie du mot de passe. Une fois validé, accès à la galerie
- **Album privé sans mot de passe** : affiché en grisé avec la mention « Accès sur invitation » — pas d'accès depuis la page d'accueil

> Le lien de partage direct (`/share/<token>`) donne toujours accès à un album privé sans mot de passe, quelle que soit la configuration.

#### Mes albums
Section visible uniquement pour les visiteurs **connectés avec Google**. Affiche les albums partagés spécifiquement avec leur adresse email.

---

### Galerie d'un album

Accessible via un lien de partage (`/share/<token>`) ou depuis la page d'accueil.

#### Visualiser les photos
Les photos sont affichées en grille. Survoler une photo affiche un bouton **Aperçu** pour ouvrir la photo en plein écran (résolution originale).

#### Télécharger des photos
Ces fonctionnalités sont disponibles **uniquement si le téléchargement est activé** sur l'album.

- Bouton **Télécharger** au survol d'une photo
- **Carré en haut à gauche** d'une photo pour la sélectionner
- Barre flottante en bas avec **Télécharger la sélection** (ZIP)
- Bouton **Tout télécharger** (ZIP de l'album complet)
- Bouton **Tout sélectionner / Tout désélectionner**

Si le téléchargement est désactivé, ces éléments sont masqués et seul l'aperçu reste disponible.

#### Copier le lien de partage
Visible uniquement pour les visiteurs ayant un accès explicite à l'album. Copie l'URL de l'album dans le presse-papiers.

---

### Page contact

Formulaire de contact responsive :
- **Mobile** : sections empilées verticalement
- **Desktop** : deux colonnes — gauche (présentation, fond configurable) et droite (formulaire)

La colonne gauche affiche le titre de la page, la description du studio et l'email de contact. Le fond peut être une couleur unie ou une image de fond (configurables dans les paramètres).

À l'envoi, le message est enregistré et accessible dans l'espace admin.

---

### Connexion visiteur

Le bouton Google Sign-In est disponible dans le header du site public. La connexion permet :
- D'accéder aux albums privés partagés avec son email (section « Mes albums »)
- De copier le lien de partage d'un album auquel on a accès

La session est valable 7 jours.

---

## Espace administration

Accessible à l'adresse `/admin/login`.

### Connexion admin

La connexion se fait exclusivement via **Google Sign-In**. Seule l'adresse email définie dans la variable d'environnement `ADMIN_EMAIL` a accès à l'espace admin.

---

### Albums

#### Liste des albums (`/admin/albums`)

Tableau récapitulatif de tous les albums avec :
- Nom (cliquable → ouvre la gestion des photos)
- Nombre de photos
- Statut (Public / Privé)
- Date de création
- Actions

#### Créer un album
Cliquer sur **Nouvel album** (haut droite). Renseigner :

| Champ | Description |
|---|---|
| **Nom** | Titre de l'album (obligatoire) |
| **Description** | Texte affiché sous le titre dans la galerie (optionnel) |
| **Visible publiquement** | Si activé, l'album apparaît dans la section Albums pour tous |
| **Téléchargeable** | Si désactivé, les boutons et cases de téléchargement sont masqués dans la galerie |
| **Afficher dans le Portfolio** | Si activé, l'album apparaît dans la section Portfolio de la page d'accueil (au lieu de la section Albums) |
| **Mot de passe d'accès** | Optionnel — permet aux visiteurs d'accéder à cet album privé depuis la page d'accueil en saisissant le mot de passe |
| **Accès par email** | Emails des visiteurs pouvant voir cet album dans « Mes albums » (taper l'email + Entrée) |

#### Modifier un album
Cliquer sur l'icône **crayon**. Les mêmes champs sont modifiables, plus :

| Champ | Description |
|---|---|
| **Image de couverture** | Upload d'une image indépendante des photos de l'album pour la vignette de la page d'accueil |

Pour le mot de passe en mode édition :
- Laisser vide → mot de passe inchangé
- Saisir un nouveau texte → remplace le mot de passe existant
- Effacer entièrement → supprime la protection par mot de passe

#### Copier le lien de partage
Cliquer sur l'icône **lien** pour copier l'URL de la galerie dans le presse-papiers.

#### Régénérer le lien
Cliquer sur l'icône **flèche circulaire**. Confirmation requise. L'ancien lien devient immédiatement inutilisable. Le nouveau lien est copié automatiquement.

> Utile si un lien a été partagé par erreur ou si on veut révoquer l'accès.

#### Supprimer un album
Cliquer sur l'icône **corbeille**. Confirmation requise. **Toutes les photos sont supprimées définitivement** (fichiers et miniatures supprimés du stockage MinIO).

---

### Photos d'un album

Accessible en cliquant sur le nom d'un album ou sur l'icône **galerie**.

#### Upload de photos
Cliquer sur **Ajouter des photos**. Sélection multiple possible. Formats acceptés : JPEG, PNG, WebP, GIF. Taille maximale par fichier : 100 Mo.

Les miniatures (thumbnails) sont générées automatiquement après l'upload.

#### Photo de couverture (depuis l'album)
Cliquer sur l'icône **étoile** sous une photo pour la définir comme couverture de l'album. Cette couverture est utilisée comme vignette sur la page d'accueil si aucune image de couverture indépendante n'est définie.

La photo de couverture est indiquée par un encadré bleu et un badge « Couverture ».

> **Priorité d'affichage** : l'image uploadée via le formulaire de modification de l'album (indépendante) a priorité sur la photo de couverture choisie ici.

#### Copier le lien de téléchargement
Cliquer sur l'icône **copie** pour copier l'URL directe de téléchargement de la photo originale.

#### Supprimer une photo
Cliquer sur l'icône **corbeille**. Confirmation requise. La photo et sa miniature sont supprimées définitivement du stockage.

---

### Messages

#### Liste des messages

Tableau de tous les messages reçus via le formulaire de contact. Les messages non lus apparaissent en **gras** avec un point bleu.

#### Lire un message
Cliquer sur une ligne ou sur le bouton **Lire**. Un panneau s'ouvre à droite avec :
- Nom et email de l'expéditeur
- Date et heure de réception
- Texte complet du message
- Bouton **Répondre par email** (ouvre le client mail avec l'adresse pré-remplie)

Le message est automatiquement marqué comme lu à l'ouverture.

#### Supprimer un message
Via le bouton **corbeille** dans le tableau ou dans le panneau de lecture. Confirmation requise.

---

### Paramètres

Tous les champs texte des paramètres disposent d'un **éditeur de texte riche** : mise en gras, italique, et retours à la ligne sont supportés.

#### Identité
| Champ | Description |
|---|---|
| **Logo** | Image affichée dans le header et la page de connexion |
| **Nom du site** | Affiché dans l'onglet du navigateur |
| **Email de contact** | Affiché sur la page contact |
| **Description / Biographie** | Texte de présentation (footer, page contact) |
| **Texte du pied de page** | Copyright ou mention légale dans le footer |

#### Apparence
| Option | Description |
|---|---|
| **Thème** | Sombre ou Clair |
| **Couleur principale** | Couleur des boutons et éléments interactifs |
| **Police des titres** | Cormorant Garamond, Playfair Display ou Montserrat |
| **Image hero** | Photo de fond de la section plein écran |

#### Contenu
| Champ | Description |
|---|---|
| **Grand titre** | Titre principal du hero |
| **Sous-titre** | Texte descriptif sous le titre du hero |
| **Texte du bouton d'appel à l'action** | Texte du bouton dans le hero |
| **Titre de la section Portfolio** | Titre affiché au-dessus de la grille Portfolio |
| **Texte du bouton Portfolio** | Lien affiché sous les albums Portfolio (ex. « Réserver une séance → ») |
| **Photo du photographe** | Portrait affiché dans la section À propos |
| **Titre de la section À propos** | Titre au-dessus de la biographie |
| **Biographie** | Texte de présentation (la section n'apparaît pas si vide) |
| **Titre de la page contact** | Grand titre affiché dans le panneau gauche de la page contact |

#### Contact & Réseaux sociaux
| Champ | Description |
|---|---|
| **Fond de la page contact** | Couleur de fond (sélecteur) ou image de fond (upload) pour le panneau gauche de la page contact — l'image est prioritaire sur la couleur |
| **Instagram / Facebook / Pinterest / Site web** | URLs complètes des profils, affichées dans le footer |

#### Stockage
Affichage en lecture seule de l'utilisation du stockage :
- Espace utilisé (en Mo ou Go)
- Limite configurée (via variable d'env `STORAGE_LIMIT_GB`)
- Barre de progression (verte → orange à 70% → rouge à 90%)

#### Sécurité
Formulaire de changement de mot de passe administrateur. Toutes les sessions existantes sont invalidées après le changement.
