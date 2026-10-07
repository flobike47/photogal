---
name: photogal-run
description: Lancer PhotoGal en local et le vérifier dans le navigateur (comptes de test, albums de démo). À utiliser pour démarrer l'app, faire une capture ou vérifier visuellement un changement.
---

# Lancer et vérifier PhotoGal

## Démarrage
1. Docker : sur macOS, `colima status` puis `colima start` si besoin.
2. `npm run dev:infra` (MinIO sur :9000, console :9001).
3. Si la DB ou le bucket sont vides : `npm run seed` (**efface** les données de dev, demander si l'utilisateur a des données à garder).
4. `npm run dev` en arrière-plan : API sur http://localhost:3001, front sur http://localhost:5173. Attendre que `curl -s localhost:3001/api/health` réponde.

## Comptes et données
- Admin : http://localhost:5173/admin/login, `admin@localhost` / `dev-changeme` (ou valeurs du `.env`).
- Albums de démo : `/share/demo-mariage` (40 photos), `/share/demo-prive-mdp` (mot de passe `test1234`), `/share/demo-non-telechargeable`, `/share/demo-orientation` (EXIF), `/share/demo-vide`. Liste complète dans `DEVELOPPEMENT.md`.

## Vérification visuelle
- Utiliser Claude in Chrome (skill `claude-in-chrome`) pour naviguer, cliquer et capturer.
- Pages publiques : vérifier aussi en largeur mobile (~400 px).
- Vérifier la console navigateur et les logs de l'API (pino) : aucune erreur nouvelle.
