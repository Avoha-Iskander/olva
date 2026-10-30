# CLAUDE.md

Olva (nom provisoire) — application de recettes et de listes de courses (Next.js + TypeScript, Supabase, Vercel).
**Le cahier des charges est dans `SPEC.md`** : lis la section concernée avant toute tâche.

## Règles de travail

- `SPEC.md` est la source de vérité fonctionnelle. Une fonctionnalité absente du SPEC est hors périmètre : propose-la, ne l'implémente pas.
- On travaille **lot par lot** (SPEC §12). Ne commence pas un lot tant que le précédent n'a pas ses critères d'acceptation validés.
- Avant de coder une user story : reformule-la, liste les fichiers touchés, **attends ma validation**.
- Si une demande contredit le SPEC, signale la contradiction avant d'agir.
- Toute décision d'architecture prise en séance est ajoutée au journal des décisions (SPEC §14).

## Mode explication

Tu écris tout le code. Je ne code pas, mais je veux **comprendre** ce que tu fais. Je suis en formation (The Odin Project, Foundations terminé). Donc :

- Explique en français, au fil de l'eau, ce que fait chaque fichier ou bloc important et pourquoi tu l'écris ainsi.
- Introduis chaque notion nouvelle (hook React, RLS, migration, service worker…) en 2 ou 3 phrases simples, avec une analogie si utile.
- Privilégie le code lisible au code astucieux ; commente les passages non évidents.
- Quand je dis que je ne comprends pas : réexplique autrement, puis recommande une ressource ciblée (vidéo, tutoriel, page de documentation officielle, section de The Odin Project) en précisant ce qu'elle couvre.
- À la fin de chaque tâche : résume en 3 lignes les notions nouvelles et vérifie ma compréhension par une ou deux questions.

## Commandes

<!-- [À COMPLÉTER au lot 0] -->

- Lancer en local : `npm run dev`
- Tests : `npm test`
- Lint : `npm run lint`
- Vérification des types : `npm run typecheck`
- Formater tout le code : `npm run format`
- Se connecter au CLI Supabase (une fois par machine) : `npx supabase login`
- Lier le dépôt au projet dev (une fois) : `npx supabase link --project-ref pchopmvcwbablzuozqgn`
- Nouvelle migration : `npm run db:new <nom>`
- Appliquer les migrations (dev) : `npx supabase db push`
- Générer les types TypeScript : `npm run db:types`
- Appliquer les migrations en prod (Alex) : onglet Actions → « Appliquer les migrations en prod » → simulation, puis appliquer

## Projets Supabase

- `olva-dev` : `pchopmvcwbablzuozqgn` (région Paris) — développement, seul projet modifié par Claude
- `olva-prod` : `sskxpttvlnepnhyealzj` (région Paris) — production, migrations appliquées par Alex
- Variables : copier `.env.example` en `.env.local`

## Adresses Vercel

- Production : https://olva-jade.vercel.app (projet Supabase olva-prod)
- Aperçus de PR : `https://olva-git-<branche>-alexandregueno14-2983.vercel.app` (projet Supabase olva-dev)

## Conventions

- Code et noms techniques en anglais ; interface en français.
- Branches : `feat/US-XXX-description`, `fix/…` ; PR avec « closes #N ».
- Toute évolution du schéma passe par une migration dans `supabase/migrations/`. Jamais de modification directe dans l'interface Supabase.
- Les migrations sont testées sur **dev** ; je les applique moi-même en **prod**.
- La clé API Claude et la clé service Supabase ne sont utilisées que côté serveur. Aucun secret dans le code ni dans Git.
- Toute table a une politique Row Level Security (mes données + ce qui m'est partagé).
- Logique métier (portions, regroupement, conversions, report) dans des fonctions pures testées avec Vitest.
- Composants UI : shadcn/ui + Tailwind ; vérifier mode clair et sombre, et cibles tactiles ≥ 44 px.

## À ne jamais faire

- Pousser directement sur `main`.
- Appliquer une migration en prod.
- Ajouter une dépendance sans me l'expliquer et me demander.
- Désactiver un test ou une règle de lint pour faire passer la CI.
