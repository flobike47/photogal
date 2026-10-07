---
name: bugfix
description: Corriger un bug PhotoGal en partant d'une reproduction automatisée et de la cause racine. À utiliser quand l'utilisateur signale un bug, une régression ou un comportement inattendu.
---

# Correction de bug

1. **Reproduire d'abord** : écrire un test qui échoue (Vitest dans `apps/api/test/` si c'est de la logique API, sinon spec Playwright). Le lancer et constater l'échec. Si la reproduction est impossible, le dire et demander plus d'infos plutôt que de deviner.
2. **Cause racine** : remonter jusqu'à la vraie cause (lire le code, `git log -p` sur le fichier, `git blame`). Expliquer en une ou deux phrases *pourquoi* le bug existe.
3. **Chercher les jumeaux** : le même motif ailleurs ? (`grep` sur le pattern fautif.) Les corriger aussi ou les signaler.
4. **Corriger** au plus petit périmètre qui traite la cause, pas le symptôme.
5. **Vérifier** : le test passe, `npm run check` passe, specs e2e liées passent. Si un `test.fail` existait pour ce bug dans `PARCOURS.md`, le retirer.
6. **Rendre compte** : cause, correctif, test ajouté. Message de commit proposé : `fix: <description en français>`.
