---
name: ship
description: Préparer la livraison du travail en cours sur PhotoGal (revue, vérifications, commit, PR). À utiliser quand l'utilisateur dit « on livre », « ship », « fais la PR » ou « commit ».
---

# Livrer

1. `git status` et `git diff` : vérifier que le diff ne contient que ce qui est voulu (pas de fichier de debug, pas de `.env`, pas de `console.log` oublié).
2. Lancer `npm run check`. Si l'API ou un parcours a changé, lancer les specs e2e concernées (MinIO requis : `npm run dev:infra`).
3. Lancer `/code-review` sur le diff. Si le diff touche auth, accès aux albums, upload ou téléchargement : lancer aussi `/security-review`. Corriger ce qui est confirmé.
4. Mettre à jour la doc si besoin : `DEVELOPPEMENT.md` (dev), `MANUEL.md` (fonctionnalité visible), `e2e/PARCOURS.md`, `.env.example`.
5. Commit au format du repo : `type: description en français` (voir `git log --oneline`). Un commit par sujet.
6. Ne pas pousser sur `main` directement : un push sur `main` **déploie en prod** (build ARM64 + webhook Portainer). Créer une branche et une PR avec `gh pr create`, sauf instruction contraire.
