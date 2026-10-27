# Cahier des charges — Olva (nom provisoire)

> **Statut** : v0.3 — fonctionnel et choix techniques tranchés
> **Auteur** : Alex
> **Dernière mise à jour** : 2026-10-26
>
> Légende : `[À COMPLÉTER]` = à remplir · `[À DÉCIDER]` = choix ouvert · `[PRÉ-REMPLI]` = proposé, à valider
>
> Les règles de travail avec Claude Code sont dans `CLAUDE.md`. Ce document décrit **quoi** construire.

---

## 1. Contexte

### 1.1 Problème à résoudre

[PRÉ-REMPLI] Préparer les courses de la semaine prend du temps et on oublie des articles : il faut retrouver les recettes (souvent dans des livres papier), recalculer les quantités, additionner les ingrédients communs, vérifier le placard, penser aux achats courants, puis faire les courses à deux sans acheter en double.

### 1.2 Existant

Prototype Google Sheets + Apps Script :

- Ingestion de recettes depuis photos de livres via l'API Claude (vision)
- Génération de la liste de courses hebdomadaire à partir d'une sélection de recettes
- Intégration Leclerc Drive (abandonnée pour le MVP)
- Leçons retenues : séparer rayon / canal / statut placard ; prévoir des correspondances pour les noms d'ingrédients incohérents ; convertir les unités pour pouvoir additionner (ex. « 1 boîte de tomates cerises » + « 250 g de tomates cerises »)

Le prototype contient environ **100 recettes** et reste utilisé jusqu'à la bascule (fin du MVP).

### 1.3 Positionnement

Concurrent principal : Jow. Fort sur l'usage « recette d'abord », faible sur la gestion de liste au quotidien, les articles non alimentaires, les achats courants et l'accès hors ligne.

Proposition de valeur : **Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.**

---

## 2. Objectifs

| #   | Objectif                                            | Indicateur de réussite                                                                                                                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Remplacer le prototype Sheets pour le foyer         | 4 semaines consécutives de courses avec l'app, sans revenir au Sheets                                                                                                        |
| O2  | Comprendre le code de l'app, sans l'écrire moi-même | Claude Code écrit tout le code et l'explique au fil de l'eau ; chaque notion non comprise est approfondie (vidéo, tutoriel) ; je sais expliquer ce que fait chaque lot livré |
| O3  | Garder la porte ouverte à une ouverture au public   | Architecture multi-foyers, données hébergées en UE, catalogue commun + personnalisations                                                                                     |

### 2.1 Non-objectifs (MVP)

- Commande automatique en drive
- Planning des repas par jour
- Import de recette par URL
- Notifications push
- Réseau social / partage public de recettes
- Nutrition, calories
- Budget des courses (prix, suivi des dépenses)

---

## 3. Utilisateurs

| Persona         | Besoin principal                                                       | Contexte d'usage                          |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Préparateur     | Stocker ses recettes et préparer la liste de la semaine                | Mobile ou desktop, à la maison            |
| Acheteur        | Cocher sa liste en magasin, rapidement                                 | Mobile, une main, réseau faible ou absent |
| Membre du foyer | Ajouter un article depuis la maison pendant que l'autre est en magasin | Mobile                                    |

### 3.1 Foyer

- Recettes, catalogue personnalisé et listes appartiennent à un **foyer**, partagé entre plusieurs membres.
- Rôles : **propriétaire** (invite, exclut, supprime le foyer) et **membre** (tout le reste).
- Rejoindre un foyer : **lien d'invitation à usage unique, valable 7 jours**, envoyé par le propriétaire (SMS, WhatsApp…).

---

## 4. Périmètre

### 4.1 MVP

- [ ] Comptes, foyer, invitation, rôles, suppression de compte
- [ ] Parcours d'accueil + recettes d'exemple
- [ ] Recettes : saisie manuelle, collections, photo d'illustration, recherche
- [ ] Import de recette par photo (IA) avec relecture
- [ ] Catalogue d'articles (commun + personnalisations du foyer), rayons, unités, conversions
- [ ] Création de liste en 3 étapes : recettes → placard → pré-liste et articles libres
- [ ] Regroupement des ingrédients et conversions d'unités
- [ ] Mes listes en cours
- [ ] Mode courses : liste à cocher par rayon, temps réel, hors ligne
- [ ] Report des articles non cochés + historique des listes
- [ ] Import des recettes du prototype Sheets

### 4.2 Après MVP

- Import de recette par URL (données schema.org Recipe, sinon analyse IA de la page)
- Planning des repas : affecter une recette à un jour
- Commande drive : tout ce qui est disponible au drive est commandé automatiquement, le reste (et les rayons exclus, ex. fruits et légumes) va sur la liste à cocher. Un drive au début, d'autres ensuite. Nécessite un partenariat ou un agrégateur (pas d'API publique côté enseignes)
- Notifications push
- Export des données du foyer
- Quota d'imports IA par foyer
- Documents juridiques (avant toute ouverture au public)

---

## 5. Navigation

Menu principal (accueil) avec 4 entrées :

1. **Mes recettes** — consulter, créer, importer, organiser en collections
2. **Créer une liste** — lance le parcours en 3 étapes (section 6.3)
3. **Mes listes en cours** — listes en préparation, à reprendre ou modifier
4. **Faire ses courses** — ouvre une liste finalisée en mode cases à cocher

Paramètres : nombre de personnes par défaut, membres du foyer, invitation, compte.

---

## 6. Fonctionnalités détaillées

> Format : **En tant que** … **je veux** … **afin de** …
> Critères d'acceptation testables. Priorité MoSCoW (M / S / C / W).

### 6.1 Recettes

**US-REC-01 — Créer une recette manuellement** · M
Champs : titre (obligatoire), nombre de personnes (obligatoire), ingrédients (quantité, unité, article du catalogue, remarque), étapes (facultatives), référence livre (titre du livre, numéro de page — facultatifs), photo d'illustration (facultative), collections.

- [ ] Une recette sans titre ou sans nombre de personnes ne peut pas être enregistrée
- [ ] Chaque ingrédient est rattaché à un article du catalogue (auto-complétion) ou crée un nouvel article (voir US-CAT-02)
- [ ] La photo est compressée côté téléphone avant envoi (~1 600 px, JPEG/WebP) ; une miniature est générée

**US-REC-02 — Importer une recette par photo** · M

- [ ] L'utilisateur photographie une page ; la photo est compressée puis envoyée à l'IA côté serveur
- [ ] La recette extraite s'affiche **en brouillon modifiable** ; rien n'est enregistré sans validation
- [ ] Les champs incertains et les ingrédients non reconnus dans le catalogue sont **surlignés**
- [ ] Si l'image n'est pas une recette, l'app le dit au lieu d'inventer
- [ ] Si l'IA est indisponible : message clair, photo conservée, bouton « Réessayer » et bascule vers la saisie manuelle avec la photo affichée à côté
- [ ] La photo d'import est conservée, attachée à la recette

**US-REC-03 — Organiser en collections** · M

- [ ] Une recette peut appartenir à plusieurs collections (ex. « Plats d'hiver », « Recettes rapides »)
- [ ] On peut filtrer la liste des recettes par collection

**US-REC-04 — Rechercher une recette** · S

- [ ] Recherche par titre et par ingrédient
- [ ] [À COMPLÉTER : autres filtres ?]

### 6.2 Catalogue d'articles

**US-CAT-01 — Catalogue commun** · M

- [ ] Un catalogue de base (~300 articles courants, généré par IA puis relu) fournit pour chaque article : nom, rayon, type d'unité (pièce, poids, volume), indicateur « produit de placard »
- [ ] Le catalogue commun est en lecture seule pour les foyers

**US-CAT-02 — Ajouter un article au catalogue du foyer** · M

- [ ] Quand un article tapé n'existe pas, l'utilisateur le crée en indiquant rayon et unité
- [ ] L'article créé n'est visible que dans son foyer

**US-CAT-03 — Personnaliser un article commun** · S

- [ ] Un foyer peut changer le rayon, l'indicateur placard ou une conversion d'un article commun ; la valeur du foyer remplace celle du catalogue

**US-CAT-04 — Conversions d'unités** · M

- [ ] Conversions universelles (g ↔ kg, ml ↔ l, c. à s., c. à c.…)
- [ ] Conversions par article (ex. tomates cerises : 1 boîte = 250 g)
- [ ] Sans conversion connue, les quantités restent sur des lignes séparées (jamais d'addition fausse)

### 6.3 Créer une liste (parcours en 3 étapes)

**Étape 1 — Recettes**

**US-LST-01 — Sélectionner les recettes et leurs portions** · M

- [ ] L'utilisateur choisit des recettes ; chacune reprend le nombre de personnes par défaut (paramètres), modifiable individuellement
- [ ] Les quantités sont recalculées selon les portions choisies

**Étape 2 — Placard**

**US-LST-02 — Vérifier les produits de placard** · M

- [ ] Les ingrédients marqués « produit de placard » (huile, sel, épices…) ne vont pas directement dans la liste
- [ ] Ils sont présentés pour confirmation : « j'en ai » / « à acheter »
- [ ] Seuls ceux marqués « à acheter » rejoignent la liste

**Étape 3 — Pré-liste et articles libres**

**US-LST-03 — Pré-liste anti-oubli** · M

- [ ] Une pré-liste des articles habituels du foyer (alimentaires et non alimentaires) est présentée ; l'utilisateur coche ce qui manque
- [ ] Le foyer peut ajouter ou retirer des articles de sa pré-liste

**US-LST-04 — Ajouter un article libre** · M

- [ ] Un champ avec auto-complétion propose les articles du catalogue dès la saisie
- [ ] Article existant → ajouté ; article inconnu → création (US-CAT-02) puis ajout

**Résultat**

**US-LST-05 — Regroupement** · M

- [ ] Un même article issu de plusieurs recettes ou ajouts apparaît sur une seule ligne, quantités additionnées (après conversion, voir US-CAT-04)

**US-LST-06 — Mes listes en cours** · M

- [ ] Une liste peut être enregistrée en brouillon et reprise plus tard
- [ ] Une liste finalisée devient disponible dans « Faire ses courses »

### 6.4 Faire ses courses

**US-CRS-01 — Liste à cocher par rayon** · M

- [ ] La liste est groupée par rayon ; cases larges (≥ 44 px), utilisables d'une main

**US-CRS-02 — Synchronisation du foyer** · M

- [ ] Avec réseau : un article coché ou ajouté par un membre apparaît en temps réel chez les autres
- [ ] Hors ligne : la liste reste consultable et cochable ; synchronisation au retour du réseau
- [ ] Conflits : **« coché » gagne** (un article coché par quelqu'un reste coché ; décocher n'est possible qu'en ligne) ; pour les autres modifications, la dernière modification gagne

**US-CRS-03 — Fin des courses** · M

- [ ] L'utilisateur termine la liste ; les articles non cochés sont reportés sur la prochaine liste
- [ ] La liste terminée passe dans l'historique

### 6.5 Compte et foyer

**US-CPT-01 — Créer un compte / se connecter** · M

- [ ] Connexion avec Google
- [ ] Connexion par email + mot de passe, avec confirmation de l'email à l'inscription
- [ ] Parcours « mot de passe oublié » (réinitialisation par email)
- [ ] La session reste ouverte longtemps sur mobile (pas de reconnexion à chaque ouverture)
- [ ] En prod, les emails passent par un service d'envoi dédié [À DÉCIDER au lot 2] (l'envoi intégré de Supabase est trop limité)

**US-CPT-02 — Parcours d'accueil** · M

- [ ] Après inscription : créer un foyer ou rejoindre un foyer (lien d'invitation), puis nombre de personnes par défaut
- [ ] Un nouveau foyer reçoit 3 à 5 recettes d'exemple, étiquetées « exemple », supprimables d'un coup (« Supprimer les exemples »)
- [ ] Les écrans vides affichent un message et une action claire

**US-CPT-03 — Inviter un membre** · M (voir 3.1)

**US-CPT-04 — Supprimer son compte** · M

- [ ] Suppression complète du compte et de ses données personnelles
- [ ] Si l'utilisateur est propriétaire et que le foyer a d'autres membres : il choisit à qui **transférer la propriété** avant la suppression
- [ ] S'il est le seul membre : le foyer et ses données sont supprimés (après confirmation)

---

## 7. Modèle de données (conceptuel)

| Entité                  | Champs principaux                                                                                                           | Notes                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `households`            | id, nom, portions_par_défaut                                                                                                |                                                   |
| `household_members`     | household_id, user_id, rôle (owner / member)                                                                                |                                                   |
| `invitations`           | id, household_id, token, expire_le, utilisée                                                                                | Usage unique, 7 jours                             |
| `recipes`               | id, household_id, titre, portions, étapes, livre_titre, livre_page, photo_url, photo_import_url, est_exemple                |                                                   |
| `collections`           | id, household_id, nom                                                                                                       |                                                   |
| `recipe_collections`    | recipe_id, collection_id                                                                                                    |                                                   |
| `aisles` (rayons)       | id, nom, ordre                                                                                                              |                                                   |
| `items` (catalogue)     | id, household_id (null = commun), nom, aisle_id, type_unité, est_placard                                                    |                                                   |
| `item_overrides`        | household_id, item_id, aisle_id, est_placard                                                                                | Personnalisation d'un article commun              |
| `item_aliases`          | alias, item_id                                                                                                              | Correspondances (« oignons jaunes » → « oignon ») |
| `unit_conversions`      | item_id (null = universelle), unité_source, facteur, unité_cible                                                            | Ex. tomates cerises : boîte → 250 g               |
| `recipe_ingredients`    | recipe_id, item_id, quantité, unité, remarque                                                                               |                                                   |
| `prelist_items`         | household_id, item_id, ordre                                                                                                | Pré-liste anti-oubli                              |
| `shopping_lists`        | id, household_id, statut (brouillon / prête / en cours / terminée), créée_le, terminée_le                                   |                                                   |
| `shopping_list_recipes` | list_id, recipe_id, portions                                                                                                | Recettes choisies à l'étape 1                     |
| `shopping_list_items`   | id, list_id, item_id, quantité, unité, origine (recette / placard / pré-liste / libre / report), coché, coché_par, coché_le |                                                   |
| `recipe_imports`        | id, household_id, photo_url, statut, résultat_json, modèle_utilisé                                                          | Suivi des imports IA                              |

Toutes les tables d'un foyer sont protégées par Row Level Security (un foyer ne voit que ses données + le catalogue commun).

---

## 8. Écrans

| Écran                     | Points clés                                             | Priorité d'affichage |
| ------------------------- | ------------------------------------------------------- | -------------------- |
| Accueil                   | 4 entrées (section 5)                                   | Mobile               |
| Parcours d'accueil        | Foyer, portions par défaut                              | Mobile               |
| Mes recettes              | Recherche, filtre par collection, cartes avec miniature | Mobile + desktop     |
| Détail / édition recette  | Ingrédients, étapes, livre/page, collections            | Mobile + desktop     |
| Import photo              | Capture, analyse, relecture avec champs surlignés       | Mobile               |
| Créer une liste — étape 1 | Sélection recettes + portions                           | Mobile + desktop     |
| Créer une liste — étape 2 | Placard : « j'en ai » / « à acheter »                   | Mobile               |
| Créer une liste — étape 3 | Pré-liste + champ auto-complétion                       | Mobile               |
| Mes listes en cours       | Brouillons et listes prêtes                             | Mobile               |
| Faire ses courses         | Groupée par rayon, cases larges, hors ligne             | Mobile               |
| Historique                | Listes terminées                                        | Mobile               |
| Paramètres                | Portions par défaut, foyer, invitations, compte         | Mobile + desktop     |

### 8.1 Direction visuelle

- Inspiration de départ : **Notion** — interface épurée, beaucoup de blanc, typographie lisible, peu d'ornements
- Couleurs : **blanc et nuances de bleu** (bleu pour les actions et éléments actifs, bleus très clairs pour les fonds secondaires)
- Mode sombre : déclinaison bleu nuit
- Maquettes : [À FAIRE — compléments d'inspiration possibles : Mobbin, Dribbble, Jow, Paprika, Mealime]

---

## 9. Architecture et stack technique

| Couche          | Choix                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Front           | Next.js (React), **TypeScript** en mode peu strict au départ                                       |
| Type d'app      | PWA (installable, hors ligne)                                                                      |
| Style           | **Tailwind CSS + shadcn/ui** ; mode sombre automatique (suit le téléphone)                         |
| Back, BDD, auth | Supabase (PostgreSQL), **région UE**                                                               |
| Temps réel      | Supabase Realtime                                                                                  |
| Fichiers        | Supabase Storage                                                                                   |
| IA              | API Claude, appelée **côté serveur uniquement**                                                    |
| Hébergement     | Vercel (plan Hobby)                                                                                |
| Qualité         | ESLint + Prettier (formatage à l'enregistrement, contrôle avant commit)                            |
| Tests           | **Vitest** (logique métier en priorité) ; Playwright [À DÉCIDER au lot 4]                          |
| Schéma BDD      | **Migrations SQL via le CLI Supabase**, versionnées dans `supabase/migrations/` ; types TS générés |
| Hors ligne      | [À DÉCIDER au lot 6 : IndexedDB / bibliothèque]                                                    |

### 9.1 Environnements

- **dev** : local + previews Vercel, branchés sur un projet Supabase « dev » (données de test)
- **prod** : projet Supabase « prod »
- Pas de Supabase local (Docker trop lourd sur la VM)

### 9.2 Intégration IA

- Modèle défini par **variable d'environnement serveur**, modifiable par l'administrateur uniquement
- Lot 5 : test comparatif Haiku / Sonnet sur une dizaine de pages réelles ; choix du modèle de prod ensuite
- Sortie JSON validée par un schéma, avec un indicateur de confiance par champ
- Prompt versionné dans le dépôt : `prompts/recipe-extraction.md`
- Plafond de dépenses mensuel fixé dans la console Anthropic

### 9.3 Mise en ligne

- GitHub Actions : lint + vérification TypeScript + tests à chaque push ; fusion dans `main` bloquée si échec
- Vercel : preview par branche, production à la fusion dans `main`
- Migrations : testées sur dev, appliquées **à la main** en prod
- Adresse `*.vercel.app` pendant le développement ; **domaine personnel acheté avant la fin du lot 6**
- Suivi des erreurs : journaux Vercel et Supabase (pas de Sentry pour l'instant)

### 9.4 Sauvegardes

- Export automatique de la base prod par GitHub Actions (planifié), stocké hors Supabase
- Photos sauvegardées séparément [À DÉCIDER : fréquence et emplacement]
- Restauration testée de temps en temps sur le projet dev

---

## 10. Exigences non fonctionnelles

| Domaine       | Exigence                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Hors ligne    | Mode courses consultable et cochable sans réseau                                                  |
| Responsive    | Mobile d'abord ; largeur min. 360 px                                                              |
| Accessibilité | Contrastes lisibles, cibles tactiles ≥ 44 px, texte agrandissable, navigation clavier sur desktop |
| Mode sombre   | Suit le réglage du téléphone                                                                      |
| Langue        | Français                                                                                          |
| Photos        | Compressées côté client (~1 600 px) ; taille max par photo [À COMPLÉTER]                          |
| Budget        | Hébergement ~15–25 €/an (domaine + API) ; plans gratuits Vercel, Supabase, GitHub                 |

---

## 11. Sécurité et données personnelles

- Row Level Security sur toutes les tables de foyer
- Secrets (clé API Claude, clé service Supabase) uniquement en variables d'environnement ; `.env*` dans `.gitignore`
- Données hébergées en UE (région Supabase choisie au lot 0)
- Aucune donnée personnelle dans les journaux
- Suppression de compte au MVP ; export des données après MVP
- Photos de livres : usage privé ; politique de conservation à revoir avant toute ouverture au public
- Avant ouverture au public : politique de confidentialité, CGU, mentions légales, passage aux plans payants (usage commercial interdit sur Vercel Hobby)

---

## 12. Découpage en lots

> Chaque lot se termine par une démo déployée. Avancement suivi dans GitHub Projects.

> Claude Code écrit le code ; mon rôle : valider les plans, tester, comprendre. Les notions listées sont celles à comprendre pendant le lot (explications de Claude + vidéos/tutoriels si besoin), pas des prérequis bloquants.

| Lot | Contenu                                                                                                                                           | Stories                          | Notions à comprendre                                              | Repère indicatif                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| 0   | Setup : dépôt, Next.js + TS, ESLint/Prettier, Vitest, CI GitHub Actions, Supabase dev + prod (UE), CLI migrations, Vercel, sauvegarde automatique | —                                | Structure d'un projet Next.js, npm, variables d'environnement, CI | début nov.                                 |
| 1   | Catalogue (rayons, articles, unités, conversions, catalogue initial généré) + recettes manuelles, collections, recherche, photo d'illustration    | US-CAT-01/02/04, US-REC-01/03/04 | Composants React, TypeScript de base, SQL et tables               | nov.                                       |
| 2   | Auth, foyer, rôles, invitation, RLS, parcours d'accueil, recettes d'exemple, suppression de compte                                                | US-CPT-*                         | Authentification, Row Level Security                              | début déc. · **révision de la date cible** |
| 3   | Créer une liste — étape 1 : recettes, portions, regroupement, conversions                                                                         | US-LST-01/05                     | Fonctions pures et tests                                          | déc.                                       |
| 4   | Créer une liste — étapes 2 et 3 : placard, pré-liste, articles libres, personnalisation catalogue, listes en cours                                | US-LST-02/03/04/06, US-CAT-03    | Formulaires, état d'un parcours en plusieurs étapes               | début janv. · décision Playwright          |
| 5   | Import photo IA + test Haiku/Sonnet                                                                                                               | US-REC-02                        | async/await, appels d'API côté serveur                            | janv.                                      |
| 6   | Faire ses courses : liste par rayon, temps réel, PWA hors ligne, report, historique ; achat du domaine                                            | US-CRS-*                         | Temps réel, service workers, stockage hors ligne                  | janv.                                      |
| 7   | Import des ~100 recettes du Sheets (CSV → base, correspondance des ingrédients assistée par IA, liste des cas non résolus)                        | —                                | Scripts de migration de données                                   | fin janv.                                  |
| 8   | Période d'usage : 4 semaines, corrections uniquement                                                                                              | —                                | —                                                                 | févr.                                      |

**Fin du MVP** = lots 0 à 7 livrés **et** 4 semaines de courses avec l'app sans le Sheets (lot 8). Pendant le lot 8, aucune nouvelle fonctionnalité : les idées vont en issues étiquetées `post-mvp`.

**Date cible du MVP** : **28/02/2027** — révisée après le lot 2. Implique la fin des lots 0 à 7 vers le 31/01/2027.
**Charge estimée (mon temps)** : ~100 à 150 h de validation, tests et compréhension, soit ~7 à 9 h par semaine.

---

## 13. Conventions

- Code et noms techniques en anglais ; interface en français
- Branches : `feat/US-XXX-description`, `fix/…`
- Commits : [À DÉCIDER : Conventional Commits ?]
- Issues GitHub liées aux user stories ; « closes #N » dans les PR
- Définition de « terminé » :
  - [ ] Critères d'acceptation validés
  - [ ] Tests Vitest au vert (logique métier)
  - [ ] CI au vert
  - [ ] Aucun secret commité
  - [ ] Vérifié en preview Vercel, en mode clair et sombre, sur mobile
  - [ ] Je sais expliquer ce que fait le code livré

---

## 14. Journal des décisions

| #   | Date       | Décision                                                                      | Alternatives écartées                            |
| --- | ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 001 | 2026-10-25 | TypeScript, mode peu strict au départ                                         | JavaScript ; JS puis TS                          |
| 002 | 2026-10-25 | ESLint + Prettier                                                             | Biome ; Prettier seul                            |
| 003 | 2026-10-25 | Vitest, logique métier en priorité                                            | Jest                                             |
| 004 | 2026-10-25 | GitHub Issues + Projects ; SPEC.md comme référence                            | Notion ; Todoist ; SPEC seul                     |
| 005 | 2026-10-25 | CLAUDE.md court + SPEC.md ; dossier `docs/` plus tard                         | Tout dans SPEC                                   |
| 006 | 2026-10-25 | Migrations SQL via le CLI Supabase                                            | Interface web ; ORM                              |
| 007 | 2026-10-25 | Photos d'import conservées, compression côté client, miniatures               | Suppression après analyse ; photos brutes        |
| 008 | 2026-10-25 | Plan gratuit + sauvegarde via GitHub Actions                                  | Supabase Pro ; export manuel                     |
| 009 | 2026-10-25 | Catalogue commun + personnalisations par foyer ; base initiale générée par IA | Catalogue unique ; par foyer ; reprise du Sheets |
| 010 | 2026-10-25 | Recettes du Sheets importées par script CSV                                   | Réimport par photo ; ressaisie                   |
| 011 | 2026-10-25 | Environnements dev + prod                                                     | Prod seule ; 3 environnements                    |
| 012 | 2026-10-25 | `*.vercel.app` puis domaine perso avant fin lot 6                             | Domaine dès le départ                            |
| 013 | 2026-10-25 | CI bloquante ; migrations prod manuelles                                      | Vercel seul ; migrations auto                    |
| 014 | 2026-10-25 | Journaux Vercel/Supabase uniquement                                           | Sentry                                           |
| 015 | 2026-10-25 | Temps réel + « coché gagne » hors ligne                                       | Rafraîchissement manuel ; détection de conflits  |
| 016 | 2026-10-25 | Lien d'invitation 7 jours ; propriétaire + membres                            | Code ; email ; tous égaux                        |
| 017 | 2026-10-25 | Modèle IA configurable (admin) ; test Haiku/Sonnet ; plafond console          | Quota par foyer (post-MVP)                       |
| 018 | 2026-10-26 | Réessai + bascule saisie manuelle ; champs douteux surlignés                  | File d'attente auto ; relecture sans indication  |
| 019 | 2026-10-26 | Parcours d'accueil + recettes d'exemple                                       | Rien ; accueil sans exemples                     |
| 020 | 2026-10-26 | Tailwind CSS + shadcn/ui                                                      | CSS Modules ; Material UI / Mantine              |
| 021 | 2026-10-26 | Mode sombre auto, socle accessibilité, pas de notifications                   | Clair seul ; push au MVP                         |
| 022 | 2026-10-26 | Bonnes pratiques RGPD dès le MVP (UE, suppression)                            | Rien ; conformité complète                       |
| 023 | 2026-10-26 | Jalons sans dates + date cible MVP                                            | Planning daté par lot                            |
| 024 | 2026-10-26 | Fin MVP = lots livrés + 4 semaines d'usage                                    | Critère fonctionnel ou d'usage seul              |
| 025 | 2026-10-26 | Claude Code écrit tout le code et l'explique ; je valide et comprends         | Écrire moi-même certaines parties                |
| 026 | 2026-10-26 | Date cible MVP : 28/02/2027                                                   | —                                                |
| 027 | 2026-10-26 | Nom provisoire : Olva                                                         | —                                                |
| 028 | 2026-10-26 | Suppression du compte propriétaire : transfert de propriété                   | Suppression du foyer                             |
| 029 | 2026-10-26 | Direction visuelle inspirée de Notion, blanc et nuances de bleu               | —                                                |
| 030 | 2026-10-26 | Connexion : Google + email/mot de passe                                       | Lien magique (problème PWA) ; code par email     |

---

## 15. Questions ouvertes

- [ ] Service d'envoi d'emails pour la prod — lot 2
- [ ] Nom définitif (Olva est provisoire) — avant l'achat du domaine, lot 6
- [ ] Playwright (lot 4)
- [ ] Typographie et teintes exactes de bleu
- [ ] Sauvegarde des photos : fréquence et emplacement

---

## 16. Glossaire

| Terme              | Définition                                                                              |
| ------------------ | --------------------------------------------------------------------------------------- |
| Foyer              | Groupe d'utilisateurs partageant recettes, catalogue personnalisé et listes             |
| Catalogue          | Référentiel des articles (commun + articles et personnalisations du foyer)              |
| Rayon              | Zone du magasin ; détermine le tri de la liste                                          |
| Produit de placard | Article de base (huile, sel, épices…) à confirmer à l'étape 2 plutôt qu'ajouté d'office |
| Pré-liste          | Liste des articles habituels du foyer, passée en revue à l'étape 3 pour ne rien oublier |
| Collection         | Groupe de recettes (ex. « Plats d'hiver »)                                              |
| Report             | Article non coché, reporté automatiquement sur la liste suivante                        |
