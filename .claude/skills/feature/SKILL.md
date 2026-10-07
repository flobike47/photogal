---
name: feature
description: Développer une nouvelle fonctionnalité PhotoGal de bout en bout (exploration, plan, implémentation, tests, vérification). À utiliser quand l'utilisateur demande d'ajouter ou de modifier un comportement visible.
---

# Nouvelle fonctionnalité

1. **Comprendre** : reformuler le besoin en une phrase et le critère de réussite. Si ambigu sur le comportement attendu (pas sur l'implémentation), poser la question.
2. **Explorer** : lire les routes / pages concernées et `e2e/PARCOURS.md`. Repérer les helpers existants à réutiliser (`withoutSecrets`, `apiClient`, `thumbUrl`, `createLimiter`…).
3. **Plan** : si plus de 3 fichiers ou un changement de schéma, présenter le plan (fichiers, migration `db.ts`, impact sécurité, impact Raspberry Pi) et attendre validation.
4. **Implémenter** en suivant les conventions de `CLAUDE.md`. Ordre : schéma/types → API → front.
5. **Tester** :
   - API : ajouter un test Vitest dans `apps/api/test/` (via `app.inject`) pour chaque règle métier ou contrôle d'accès.
   - Parcours : ajouter/mettre à jour le critère dans `e2e/PARCOURS.md` et la spec Playwright, la lancer seule.
6. **Vérifier** : `npm run check`, puis l'UI dans le navigateur (skill `photogal-run`), desktop et mobile si page publique.
7. **Rendre compte** : ce qui a changé, comment c'est vérifié, risques ou suites possibles. Pas de commit sans demande.
