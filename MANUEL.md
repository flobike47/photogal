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

La page d'accueil est composée de quatre sections verticales.

#### Section Hero
Plein écran avec un grand titre, un sous-titre et un bouton « Découvrir les galeries ». Si une image de fond est définie dans les paramètres, elle s'affiche avec un voile sombre. Sinon un dégradé est utilisé.

#### Section À propos
S'affiche uniquement si un texte de présentation est renseigné dans les paramètres. Contient une photo optionnelle (portrait), un titre, un texte de biographie et un bouton vers la page contact.

#### Galeries
Grille de toutes les albums **publics** du site. Chaque vignette affiche :
- La photo de couverture de l'album
- Le nom de l'album
- Le nombre de photos

Un clic sur une vignette ouvre la galerie de l'album.

#### Mes albums
Section visible uniquement pour les visiteurs **connectés avec Google**. Affiche les albums qui ont été partagés spécifiquement avec leur adresse email (albums privés).

---

### Galerie d'un album

Accessible via un lien de partage (`/share/<token>`) ou depuis la page d'accueil.

#### Visualiser les photos
Les photos sont affichées en grille. Survoler une photo affiche :
- Un bouton **Aperçu** pour ouvrir la photo en plein écran (résolution originale)
- Un bouton **Télécharger** pour télécharger la photo seule
- La taille du fichier

#### Sélectionner des photos
Cliquer sur le **carré en haut à gauche** d'une photo la sélectionne. Une barre flottante apparaît en bas de l'écran indiquant le nombre de photos sélectionnées.

Boutons disponibles :
- **Tout sélectionner / Tout désélectionner** — sélectionne ou vide toute la galerie
- **Annuler** — vide la sélection
- **Télécharger la sélection** — télécharge les photos sélectionnées dans un fichier ZIP

#### Télécharger tout l'album
Le bouton **Tout télécharger** (en haut à droite) télécharge l'intégralité des photos de l'album dans un ZIP.

#### Copier le lien de partage
Visible uniquement pour les visiteurs ayant un accès explicite à l'album (leur email est dans la liste d'accès). Copie l'URL de l'album dans le presse-papiers.

---

### Page contact

Formulaire de contact en deux colonnes :
- **Gauche** : présentation du studio, email de contact
- **Droite** : formulaire avec les champs Nom, Email et Message

À l'envoi, le message est enregistré et accessible dans l'espace admin. Un message de confirmation s'affiche.

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
| **Visible publiquement** | Si activé, l'album apparaît sur la page d'accueil pour tous |
| **Accès par email** | Emails des visiteurs pouvant voir cet album dans « Mes albums » (taper l'email + Entrée) |

#### Modifier un album
Cliquer sur l'icône **crayon**. Les mêmes champs sont modifiables.

#### Copier le lien de partage
Cliquer sur l'icône **lien** pour copier l'URL de la galerie publique dans le presse-papiers.

#### Régénérer le lien
Cliquer sur l'icône **flèche circulaire**. Confirmation requise. L'ancien lien devient immédiatement inutilisable. Le nouveau lien est copié automatiquement dans le presse-papiers.

> Utile si un lien a été partagé par erreur ou si on veut révoquer l'accès.

#### Supprimer un album
Cliquer sur l'icône **corbeille**. Confirmation requise. **Toutes les photos sont supprimées définitivement** (fichiers et miniatures supprimés du stockage MinIO).

---

### Photos d'un album

Accessible en cliquant sur le nom d'un album ou sur l'icône **galerie**.

#### Upload de photos
Cliquer sur **Ajouter des photos**. Sélection multiple possible. Formats acceptés : JPEG, PNG, WebP, GIF. Taille maximale par fichier : 100 Mo.

Les miniatures (thumbnails) sont générées automatiquement après l'upload.

#### Photo de couverture
Cliquer sur l'icône **étoile** sous une photo pour la définir comme couverture de l'album. La couverture est la vignette affichée sur la page d'accueil.

La photo de couverture est indiquée par un encadré bleu et un badge « Couverture ».

#### Copier le lien de téléchargement
Cliquer sur l'icône **copie** pour copier l'URL directe de téléchargement de la photo originale.

#### Supprimer une photo
Cliquer sur l'icône **corbeille**. Confirmation requise. La photo et sa miniature sont supprimées définitivement du stockage.

---

### Messages

#### Liste des messages

Tableau de tous les messages reçus via le formulaire de contact. Les messages non lus apparaissent en **gras** avec un point bleu.

En-tête : nombre de messages non lus.

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

#### Identité
| Champ | Description |
|---|---|
| **Logo** | Image affichée dans le header et la page de connexion (PNG/SVG avec fond transparent recommandé) |
| **Nom du site** | Affiché dans l'onglet du navigateur et les titres |
| **Email de contact** | Affiché sur la page contact |
| **Description courte** | Sous-titre discret sur le hero et la page contact |
| **Texte du pied de page** | Copyright ou mention légale dans le footer |

#### Apparence
| Option | Description |
|---|---|
| **Thème** | Sombre ou Clair — change les couleurs de fond de tout le site public |
| **Couleur principale** | Couleur des boutons et éléments interactifs (sélecteur de couleur avec presets) |
| **Police des titres** | Cormorant Garamond, Playfair Display ou Montserrat |
| **Image hero** | Photo de fond de la section plein écran (résolution 1920×1080 minimum recommandée) |

#### Contenu
| Champ | Description |
|---|---|
| **Grand titre** | Titre principal affiché dans le hero |
| **Sous-titre** | Texte descriptif sous le titre du hero |
| **Photo du photographe** | Portrait affiché dans la section À propos |
| **Titre de la section À propos** | Titre au-dessus de la biographie |
| **Biographie** | Texte de présentation (la section n'apparaît pas si ce champ est vide) |

#### Contact & Réseaux sociaux
Renseigner les URLs complètes des profils. Les réseaux renseignés apparaissent dans le footer du site. Champs disponibles : Instagram, Facebook, Pinterest, Site web externe.

#### Stockage
Affichage en lecture seule de l'utilisation du stockage :
- Espace utilisé (en Mo ou Go)
- Limite configurée (via variable d'env `STORAGE_LIMIT_GB`)
- Barre de progression (verte → orange à 70% → rouge à 90%)
- Alertes automatiques à 70% et 90% d'utilisation

> La limite se configure dans Portainer via la variable `STORAGE_LIMIT_GB`. Les uploads sont bloqués si la limite est atteinte.

#### Sécurité
Formulaire de changement de mot de passe administrateur. Renseigner le mot de passe actuel, le nouveau mot de passe (6 caractères minimum) et la confirmation. Toutes les sessions existantes sont invalidées après le changement.
