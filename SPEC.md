# Cahier des charges — Olva

> **Statut** : v0.5 — revue des ingrédients, ingrédients de base
> **Auteur** : Alex
> **Dernière mise à jour** : 2026-11-07
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

Concurrents :

| Application                                                     | Points forts                                                                                                                                                                                       | Points faibles / différence avec Olva                                                                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Jow**                                                         | Usage « recette d'abord », catalogue de recettes fourni, commande drive intégrée (partenariats enseignes)                                                                                          | Faible sur la gestion de liste au quotidien, les articles non alimentaires, les achats courants et l'accès hors ligne ; recettes imposées plutôt que les siennes                                 |
| **WeChef – Carnet de recettes** (iPhone, 4,7/5 sur ~5 200 avis) | Très proche d'Olva sur les recettes personnelles : import par lien, scan de pages de livres (OCR), ajustement des portions, planning, listes de courses générées et triées par rayon, assistant IA | iPhone uniquement ; modèle freemium avec publicité et abonnement ; bibliothèque de recettes partagée seulement à l'étude ; pas de vérification du placard ni de pré-liste anti-oubli identifiées |

**Conséquence pour Olva** : WeChef couvre déjà une grande partie du volet recettes. La différence d'Olva se joue sur la **préparation de la liste** (revue des ingrédients, pré-liste anti-oubli, articles non alimentaires, achats courants), le **mode courses à deux en temps réel et hors ligne**, le **partage de bibliothèque** et la disponibilité **web + Android + iPhone**.

Proposition de valeur : **Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.**

---

## 2. Objectifs

| #   | Objectif                                            | Indicateur de réussite                                                                                                                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Remplacer le prototype Sheets à la maison           | 4 semaines consécutives de courses avec l'app, sans revenir au Sheets                                                                                                        |
| O2  | Comprendre le code de l'app, sans l'écrire moi-même | Claude Code écrit tout le code et l'explique au fil de l'eau ; chaque notion non comprise est approfondie (vidéo, tutoriel) ; je sais expliquer ce que fait chaque lot livré |
| O3  | Garder la porte ouverte à une ouverture au public   | Comptes individuels avec partage, données hébergées en UE, catalogue commun + personnalisations                                                                              |

### 2.1 Non-objectifs (MVP)

- Commande automatique en drive
- Planning des repas par jour
- Notifications push
- Réseau social / partage public de recettes
- Nutrition, calories
- Budget des courses (prix, suivi des dépenses)

---

## 3. Utilisateurs

| Persona     | Besoin principal                                                       | Contexte d'usage                          |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Préparateur | Stocker ses recettes et préparer la liste de la semaine                | Mobile ou desktop, à la maison            |
| Acheteur    | Cocher sa liste en magasin, rapidement                                 | Mobile, une main, réseau faible ou absent |
| Co-acheteur | Ajouter un article depuis la maison pendant que l'autre est en magasin | Mobile                                    |

### 3.1 Comptes et partage

Chaque utilisateur possède ses propres données ; il n'y a pas de « foyer ».

| Objet                                     | Appartient à       | Partage                                                                                                           |
| ----------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Recette                                   | Son créateur       | **En lecture**, recette par recette **ou toute ma bibliothèque** d'un coup ; bouton « Copier dans mes recettes »  |
| Menu de la semaine                        | Son créateur       | Pas de partage (décision 068)                                                                                     |
| Liste de courses                          | Son créateur       | **En co-édition** (cocher, ajouter, retirer, modifier) ; option « partager automatiquement mes nouvelles listes » |
| Catalogue, pré-liste, portions par défaut | Chaque utilisateur | Pas de partage ; une liste partagée est triée selon les rayons de son créateur                                    |

- Seul le créateur peut modifier ou supprimer une recette, supprimer une liste, ou retirer un partage. La personne qui reçoit un partage peut aussi y renoncer.
- Partager avec quelqu'un : **lien à usage unique valable 7 jours** (SMS, WhatsApp…) ou **email** d'un utilisateur Olva existant.
- Partager « toute ma bibliothèque » inclut les recettes créées ensuite.

---

## 4. Périmètre

### 4.1 MVP

- [ ] Comptes, profil, suppression de compte
- [ ] Partage : recettes (en lecture, une ou toutes), listes (en co-édition, avec partage automatique)
- [ ] Parcours d'accueil + recettes d'exemple
- [ ] Recettes : saisie manuelle, collections, photo d'illustration, recherche
- [ ] Import de recette par photo (IA) avec relecture
- [ ] Import de recette par lien (URL) avec relecture
- [ ] Catalogue d'articles (commun + personnalisations de chaque utilisateur), rayons, unités, conversions
- [ ] Menus de la semaine (recettes + portions, sans jours) ; liste créée depuis un menu : revue des ingrédients → pré-liste et articles libres ; liste sans recette (décision 068)
- [ ] Regroupement des ingrédients et conversions d'unités
- [ ] Mes listes en cours
- [ ] Mode courses : liste à cocher par rayon, temps réel, hors ligne
- [ ] Report des articles non cochés + historique des listes
- [ ] ~~Import des recettes du prototype Sheets~~ (abandonné, décision 067)

### 4.2 Après MVP

- Planning des repas : affecter une recette d'un menu à un jour
- Partage des menus
- Commande drive : tout ce qui est disponible au drive est commandé automatiquement, le reste (et les rayons exclus, ex. fruits et légumes) va sur la liste à cocher. Un drive au début, d'autres ensuite. Nécessite un partenariat ou un agrégateur (pas d'API publique côté enseignes)
- Notifications push
- Export de ses données
- Quota d'imports IA par utilisateur
- Documents juridiques (avant toute ouverture au public)

---

## 5. Navigation

Menu principal (accueil) avec 4 entrées :

1. **Mes recettes** — consulter, créer, importer, organiser en collections
2. **Menus** — menus de la semaine ; la liste de courses se crée depuis un menu (section 6.3, décision 068)
3. **Mes listes en cours** — listes en préparation, à reprendre ou modifier ; « Nouvelle liste » crée une liste sans recette
4. **Faire ses courses** — ouvre une liste finalisée en mode cases à cocher

Paramètres : nom affiché, nombre de personnes par défaut, mes partages (envoyés et reçus), compte.

« Mes recettes » et « Mes listes en cours » affichent aussi ce qui m'est partagé, signalé par « Partagé par … ».

---

## 6. Fonctionnalités détaillées

> Format : **En tant que** … **je veux** … **afin de** …
> Critères d'acceptation testables. Priorité MoSCoW (M / S / C / W).

### 6.1 Recettes

**US-REC-01 — Créer une recette manuellement** · M
Champs : titre (obligatoire), nombre de personnes (obligatoire), ingrédients (quantité, unité, article du catalogue, remarque), étapes (facultatives), référence livre (titre du livre, numéro de page — facultatifs), lien de la page d'origine (facultatif, pré-rempli lors d'un import par lien), photo d'illustration (facultative), collections.

- [ ] Une recette sans titre ou sans nombre de personnes ne peut pas être enregistrée
- [ ] La quantité est facultative : un ingrédient sans quantité (sel, poivre, persil pour décorer…) s'affiche « au goût »
- [ ] Chaque ingrédient est rattaché à un article du catalogue (auto-complétion) ou crée un nouvel article (voir US-CAT-02)
- [ ] La photo est compressée côté téléphone avant envoi (~1 600 px, JPEG/WebP) ; une miniature est générée

**US-REC-02 — Importer une recette par photo** · M

- [ ] L'utilisateur photographie une page, ou jusqu'à 3 pages si la recette en occupe plusieurs ; les photos sont compressées puis envoyées ensemble à l'IA côté serveur, qui en tire une seule recette
- [ ] Si rien n'est à vérifier, la recette est **enregistrée directement** et sa fiche s'ouvre (bandeau « Recette importée », « Modifier », « Annuler l'import ») ; sinon elle s'affiche **en brouillon modifiable** et rien n'est enregistré sans validation (décision 060)
- [ ] Les champs incertains et les ingrédients non reconnus dans le catalogue sont **surlignés**
- [ ] Si l'image n'est pas une recette, l'app le dit au lieu d'inventer
- [ ] Si l'IA est indisponible : message clair, photo conservée, bouton « Réessayer » et bascule vers la saisie manuelle avec la photo affichée à côté
- [ ] La photo d'import est conservée, attachée à la recette
- [ ] Parmi les photos envoyées, celle qui montre le plat sans texte de recette devient la **photo de couverture** (elle n'est ni lue, ni rangée avec les pages) ; une photo de plat seule reste « pas une recette » (décision 062)

**US-REC-07 — Importer une recette depuis un lien** · M

- [ ] Depuis « Ajouter », je colle le lien d'une page de recette ; le serveur lit la page (données schema.org Recipe si présentes, sinon le texte de la page) et l'IA en tire la recette
- [ ] Même règle que l'import photo : enregistrement direct si rien n'est à vérifier, sinon le même **brouillon surligné** (décision 060)
- [ ] Un lien déjà importé ouvre la recette existante, sans nouvelle lecture ni doublon
- [ ] **Partager vers Olva** : depuis un navigateur ou Instagram, le menu « Partager » (Android, app installée) ou le Raccourci « Ajouter à Olva » (iPhone) ouvre Olva, qui lit le lien aussitôt (décision 065)
- [ ] **Coller le texte** : sans lien lisible (publication Instagram…), je colle le texte de la recette et il est lu de la même façon
- [ ] La photo du plat fournie par le site est proposée comme photo de présentation
- [ ] Le lien d'origine est conservé avec la recette
- [ ] Si la page n'est pas lisible (site qui bloque, pas une recette) : message clair, sans invention, et proposition de l'import par photo

**US-REC-03 — Organiser en collections** · M

- [ ] Une recette peut appartenir à plusieurs collections (ex. « Plats d'hiver », « Recettes rapides »)
- [ ] On peut filtrer la liste des recettes par collection

**US-REC-04 — Rechercher une recette** · S

- [ ] Recherche par titre et par ingrédient
- [ ] [À COMPLÉTER : autres filtres ?]

**US-REC-05 — Partager mes recettes** · M

- [ ] Je partage une recette, ou toute ma bibliothèque (y compris les recettes futures), par lien ou par email
- [ ] La personne voit mes recettes dans « Mes recettes », signalées « Partagé par … », sans pouvoir les modifier
- [ ] Je peux retirer un partage ; la personne peut y renoncer

**US-REC-06 — Copier une recette partagée** · S

- [ ] Depuis une recette partagée, « Copier dans mes recettes » crée une copie indépendante que je peux modifier
- [ ] Les ingrédients de la copie sont rattachés à mon catalogue (articles personnels du créateur copiés si besoin)

### 6.2 Catalogue d'articles

**US-CAT-01 — Catalogue commun** · M

- [ ] Un catalogue de base (~720 articles courants depuis la décision 057, généré par IA puis relu) fournit pour chaque article : nom, rayon, unité par défaut, indicateur « ingrédient de base » et, pour ceux-ci, l'unité de conditionnement (bouteille, paquet, pot…)
- [ ] Le catalogue commun est en lecture seule pour les utilisateurs

**US-CAT-05 — Reconnaître les ingrédients** · M

- [ ] Les articles de base portent le nom le plus simple (« Beurre », « Lait », « Crème fraîche ») ; les variantes gardent leur nom complet (« Beurre demi-sel »)
- [ ] Des synonymes communs relient les noms courants des recettes au bon article (« crème épaisse » → Crème fraîche, « gruyère râpé » → Fromage râpé)
- [ ] Quand je change ou choisis l'article d'un ingrédient importé, l'app s'en souvient pour mes prochains imports (synonyme personnel, prioritaire sur le choix de l'IA)
- [ ] À l'import, l'IA choisit l'article dans le catalogue ; un choix sans correspondance évidente est signalé « proposé », sans action demandée (décision 058)
- [ ] À l'import, la quantité est mise dans l'unité habituelle de l'article grâce aux poids moyens par pièce (« 200 g » de carottes → 2 pièces) ; la quantité de la recette reste en note (décision 059)
- [ ] Les accents comptent dans la reconnaissance : « pâtes » n'est pas « Pâté » ; un mot écrit sans aucun accent reste reconnu (« echalote »)
- [ ] Un nouvel article est pré-rempli (rayon, unité de cuisine, unité d'achat) ; je n'ai qu'à valider

**US-CAT-02 — Ajouter un article à mon catalogue** · M

- [ ] Quand un article tapé n'existe pas, l'utilisateur le crée en indiquant rayon et unité
- [ ] L'article créé n'est visible que par moi (et par ceux qui voient une de mes recettes ou listes partagées)

**US-CAT-03 — Personnaliser un article commun** · S

- [ ] Je peux changer le rayon, l'indicateur « ingrédient de base » ou une conversion d'un article commun ; ma valeur remplace celle du catalogue

**US-CAT-04 — Conversions d'unités** · M

- [ ] Conversions universelles (g ↔ kg, ml ↔ l, c. à s., c. à c.…)
- [ ] Conversions par article (ex. tomates cerises : 1 boîte = 250 g)
- [ ] Sans conversion connue, les quantités restent sur des lignes séparées (jamais d'addition fausse)

### 6.3 Menus et listes

> Décision 068 : le choix des recettes (ancienne étape 1) se fait dans un **menu de la semaine** ; la liste se crée depuis le menu et commence à la revue des ingrédients.

**US-MEN-01 — Créer un menu** · M

En tant que préparateur, je veux composer le menu de la semaine avec mes recettes, afin de savoir quoi cuisiner et de préparer la liste à partir de lui.

- [ ] « Nouveau » ouvre le **formulaire du menu** : nom proposé « Semaine du [lundi de la semaine en cours] », modifiable ; rien n'est enregistré avant de valider (décision 069)
- [ ] Je choisis des recettes (les miennes et celles qu'on me partage) ; chacune reprend le nombre de personnes par défaut (paramètres), modifiable individuellement
- [ ] Les recettes sont proposées par ordre alphabétique (décision 063), avec recherche et filtre par collection
- [ ] « Créer une recette » (à la main, photo, lien ou texte collé) depuis le formulaire : le menu est d'abord enregistré ; une fois la recette enregistrée, je reviens au formulaire avec la nouvelle recette **déjà ajoutée** (reprend la décision 064)
- [ ] Le bas du formulaire propose **« Enregistrer le menu »** (ouvre la fiche du menu) et **« Enregistrer et créer la liste »** (ouvre la revue ; « … et voir la liste » si le menu a déjà une liste en cours)
- [ ] Pas de jours de la semaine (le planning par jour reste après le MVP)

**US-MEN-05 — Fiche d'un menu** · M

- [ ] La fiche n'affiche **que les recettes du menu** (miniature, titre, personnes) ; toucher une recette ouvre sa fiche
- [ ] Pour chaque recette : **changer les portions** ou la **retirer du menu** (menu ⋯ sur ordinateur, glissement à gauche sur mobile, comme Mes recettes)
- [ ] « Modifier » ouvre le formulaire du menu ; « Supprimer le menu… » (avec confirmation) le supprime et revient à Mes menus
- [ ] « Créer la liste » / « Voir la liste » / « Créer une nouvelle liste » (US-MEN-02, US-MEN-03)

**US-MEN-02 — Créer la liste depuis un menu** · M

- [ ] « Créer la liste » (fiche) ou « Enregistrer et créer la liste » (formulaire) crée une liste avec les recettes et portions du menu, et ouvre directement la **revue des ingrédients** (US-LST-02), puis la pré-liste (US-LST-03)
- [ ] La liste garde le lien vers son menu ; le menu affiche sa liste (« Voir la liste ») au lieu de « Créer la liste »
- [ ] Un menu sans recette ne peut pas créer de liste

**US-MEN-03 — Modifier un menu qui a déjà une liste** · M

- [ ] Une recette ajoutée au menu après la création de la liste est signalée « Pas encore dans la liste », avec un bouton **« Ajouter à la liste »**
- [ ] Liste en brouillon : la recette rejoint la revue, qui se recalcule en conservant mes ajustements (US-LST-02)
- [ ] Liste prête ou en cours : les ingrédients de la recette sont **fusionnés** dans la liste (même article → quantités additionnées après conversion, US-LST-05 ; ingrédients de base non ajoutés) ; les personnes avec qui la liste est partagée le voient en temps réel
- [ ] Changer les portions ou retirer une recette du menu ne modifie pas la liste
- [ ] Liste terminée : le bouton devient « Créer une nouvelle liste »

**US-MEN-04 — Mes menus** · M

- [ ] Les menus sont affichés du plus récent au plus ancien, avec leurs recettes et l'état de leur liste
- [ ] « Dupliquer » crée un nouveau menu (nom par défaut) avec les mêmes recettes et portions, sans liste
- [ ] Supprimer un menu (menu ⋯, glissement à gauche, ou depuis sa fiche ; avec confirmation) ne supprime pas sa liste
- [ ] Les menus ne se partagent pas ; une recette supprimée disparaît des menus

**US-LST-01 — Sélectionner les recettes et leurs portions** · ~~M~~ — remplacée par US-MEN-01 et US-MEN-02 (décision 068)

**US-LST-08 — Liste sans recette** · M

- [ ] Dans « Mes listes en cours », « Nouvelle liste » crée une liste sans recette qui commence directement à la pré-liste et aux articles libres

**Étape 1 — Revue des ingrédients** (listes créées depuis un menu)

**US-LST-02 — Revue des ingrédients** · M

En tant que préparateur, je veux revoir les ingrédients calculés à partir de mes recettes, afin d'ajuster les quantités et de retirer ce que j'ai déjà avant de compléter mes courses.

- [ ] Les ingrédients des recettes choisies sont affichés regroupés (US-LST-05), avec leur quantité recalculée selon les portions
- [ ] Pour chaque ligne : ajuster la quantité (« − + » ou saisie) ou retirer la ligne ; un retrait peut être annulé
- [ ] Les **ingrédients de base** (huile, sel, épices…) apparaissent en bas, sous « Ingrédients de base — à cocher si besoin », **décochés par défaut**
- [ ] Un ingrédient de base coché est ajouté à la liste avec son **unité de conditionnement** (ex. « Huile d'olive : 1 bouteille »), pas la somme des recettes
- [ ] Ajouter une recette à la liste depuis son menu (US-MEN-03) recalcule la revue en **conservant mes ajustements** sur les ingrédients inchangés ; les ingrédients modifiés sont signalés
- [ ] Une ligne retirée ne réapparaît pas après un recalcul
- [ ] Un ingrédient **sans quantité** (« au goût ») devient un conditionnement : ingrédient de base → son unité de conditionnement, décoché (« Sel : 1 paquet ») ; autre ingrédient → 1 de son unité par défaut, coché (« Persil frais : 1 botte »)

**Étape 2 — Pré-liste et articles libres**

**US-LST-03 — Pré-liste anti-oubli** · M

- [ ] Une pré-liste de mes articles habituels (alimentaires et non alimentaires) est présentée ; je coche ce qui manque
- [ ] Je peux ajouter ou retirer des articles de ma pré-liste

**US-LST-04 — Ajouter un article libre** · M

- [ ] Un champ avec auto-complétion propose les articles du catalogue dès la saisie
- [ ] Article existant → ajouté ; article inconnu → création (US-CAT-02) puis ajout

**Résultat**

**US-LST-05 — Regroupement** · M

- [ ] Un même article issu de plusieurs recettes ou ajouts apparaît sur une seule ligne, quantités additionnées (après conversion, voir US-CAT-04)

**US-LST-06 — Mes listes en cours** · M

- [ ] Une liste peut être enregistrée en brouillon et reprise plus tard
- [ ] Une liste finalisée devient disponible dans « Faire ses courses »

**US-LST-07 — Partager une liste** · M

- [ ] Je partage une liste par lien ou par email ; la personne peut cocher, ajouter, retirer et modifier des articles
- [ ] Option « Partager automatiquement mes nouvelles listes avec … » (une ou plusieurs personnes)
- [ ] Seul le créateur peut supprimer la liste ou retirer un partage

### 6.4 Faire ses courses

**US-CRS-01 — Liste à cocher par rayon** · M

- [ ] La liste est groupée par rayon ; cases larges (≥ 44 px), utilisables d'une main

**US-CRS-02 — Synchronisation entre co-acheteurs** · M

- [ ] Avec réseau : un article coché ou ajouté par une personne avec qui la liste est partagée apparaît en temps réel chez les autres
- [ ] Hors ligne : la liste reste consultable et cochable ; synchronisation au retour du réseau
- [ ] Conflits : **« coché » gagne** (un article coché par quelqu'un reste coché ; décocher n'est possible qu'en ligne) ; pour les autres modifications, la dernière modification gagne

**US-CRS-03 — Fin des courses** · M

- [ ] L'utilisateur termine la liste ; les articles non cochés sont reportés sur la prochaine liste
- [ ] La liste terminée passe dans l'historique

### 6.5 Compte et partages

**US-CPT-01 — Créer un compte / se connecter** · M

- [ ] Connexion avec Google
- [ ] Connexion par email + mot de passe, avec confirmation de l'email à l'inscription
- [ ] Parcours « mot de passe oublié » (réinitialisation par email)
- [ ] La session reste ouverte longtemps sur mobile (pas de reconnexion à chaque ouverture)
- [ ] En prod, les emails passent par un service d'envoi dédié [À DÉCIDER au lot 1] (l'envoi intégré de Supabase est trop limité)

**US-CPT-02 — Parcours d'accueil** · M

- [ ] Après inscription : nom affiché, puis nombre de personnes par défaut
- [ ] Si l'inscription part d'un lien de partage, le partage est accepté à la fin du parcours
- [ ] Un nouvel utilisateur reçoit 3 à 5 recettes d'exemple, étiquetées « exemple », supprimables d'un coup (« Supprimer les exemples »)
- [ ] Les écrans vides affichent un message et une action claire

**US-CPT-03 — Gérer mes partages** · M

- [ ] Paramètres → « Mes partages » : ce que je partage (avec qui, quoi) et ce qu'on me partage
- [ ] Retirer un partage envoyé, renoncer à un partage reçu
- [ ] Un lien de partage est à usage unique et expire après 7 jours ; un lien expiré ou déjà utilisé affiche un message clair

**US-CPT-04 — Supprimer son compte** · M

- [ ] Suppression complète du compte et de toutes ses données (recettes, listes, catalogue personnel, partages), après confirmation
- [ ] Les personnes avec qui je partageais perdent l'accès ; un avertissement le rappelle avant la suppression
- [ ] Les copies de mes recettes faites par d'autres (US-REC-06) leur restent

---

## 7. Modèle de données (conceptuel)

| Entité                  | Champs principaux                                                                                                                                    | Notes                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `profiles`              | id (= utilisateur), nom_affiché, portions_par_défaut                                                                                                 | Créé automatiquement à l'inscription                |
| `recipes`               | id, owner_id, titre, portions, étapes, livre_titre, livre_page, photo_url, photo_import_url, est_exemple, copiée_de                                  |                                                     |
| `collections`           | id, owner_id, nom                                                                                                                                    |                                                     |
| `recipe_collections`    | recipe_id, collection_id                                                                                                                             |                                                     |
| `aisles` (rayons)       | id, nom, ordre                                                                                                                                       |                                                     |
| `items` (catalogue)     | id, owner_id (null = commun), nom, aisle_id, unité_par_défaut, est_de_base, unité_de_conditionnement                                                 |                                                     |
| `item_overrides`        | user_id, item_id, aisle_id, est_de_base                                                                                                              | Personnalisation d'un article commun                |
| `item_aliases`          | alias, item_id                                                                                                                                       | Correspondances (« oignons jaunes » → « oignon »)   |
| `unit_conversions`      | item_id (null = universelle), owner_id, unité_source, facteur, unité_cible                                                                           | Ex. tomates cerises : boîte → 250 g                 |
| `recipe_ingredients`    | recipe_id, item_id, quantité, unité, remarque                                                                                                        |                                                     |
| `prelist_items`         | user_id, item_id, ordre                                                                                                                              | Pré-liste anti-oubli                                |
| `menus`                 | id, owner_id, nom, créé_le                                                                                                                           | Menu de la semaine, non partagé                     |
| `menu_recipes`          | menu_id, recipe_id, portions, ajoutée_le                                                                                                             | Recettes du menu                                    |
| `shopping_lists`        | id, owner_id, menu_id, statut (brouillon / prête / en cours / terminée), créée_le, terminée_le                                                       | menu_id vide pour une liste sans recette            |
| `shopping_list_recipes` | list_id, recipe_id, portions                                                                                                                         | Recettes reprises du menu                           |
| `shopping_list_items`   | id, list_id, item_id, quantité_calculée, quantité, unité, retirée, origine (recette / base / pré-liste / libre / report), coché, coché_par, coché_le |                                                     |
| `recipe_shares`         | recipe_id, shared_with                                                                                                                               | Une recette, en lecture                             |
| `library_shares`        | owner_id, shared_with                                                                                                                                | Toutes mes recettes, en lecture (y compris futures) |
| `list_shares`           | list_id, shared_with                                                                                                                                 | Une liste, en co-édition                            |
| `auto_list_shares`      | owner_id, shared_with                                                                                                                                | Partage automatique de mes nouvelles listes         |
| `share_links`           | id, owner_id, type (recette / bibliothèque / liste / listes auto), cible_id, token, expire_le, utilisé_le, utilisé_par                               | Lien à usage unique, 7 jours                        |
| `recipe_imports`        | id, owner_id, photo_url, statut, résultat_json, modèle_utilisé                                                                                       | Suivi des imports IA                                |

Toutes les tables sont protégées par Row Level Security : je vois mes données, ce qu'on m'a partagé, et le catalogue commun ; je ne modifie que mes données, plus le contenu des listes partagées avec moi.

---

## 8. Écrans

| Écran                       | Points clés                                                                                                                                           | Priorité d'affichage |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Accueil                     | 4 entrées (section 5)                                                                                                                                 | Mobile               |
| Parcours d'accueil          | Nom affiché, portions par défaut                                                                                                                      | Mobile               |
| Mes recettes                | Recherche, filtre par collection, cartes avec miniature ; Modifier / Supprimer : menu ⋯ (ordinateur), glissement à gauche (mobile), avec confirmation | Mobile + desktop     |
| Détail / édition recette    | Ingrédients, étapes, livre/page, collections                                                                                                          | Mobile + desktop     |
| Import photo                | Capture, analyse, relecture avec champs surlignés                                                                                                     | Mobile               |
| Mes menus                   | Du plus récent au plus ancien ; dupliquer, supprimer (menu ⋯ / glissement)                                                                            | Mobile + desktop     |
| Fiche d'un menu             | Recettes du menu seulement (portions, retirer) ; Modifier, Supprimer ; « Créer la liste » / « Voir la liste » / « Ajouter à la liste »                | Mobile + desktop     |
| Formulaire d'un menu        | Nom, choix des recettes + portions, créer une recette ; « Enregistrer le menu » / « Enregistrer et créer la liste »                                   | Mobile + desktop     |
| Préparer la liste — étape 1 | Revue des ingrédients : ajuster, retirer ; ingrédients de base décochés                                                                               | Mobile + desktop     |
| Préparer la liste — étape 2 | Pré-liste + champ auto-complétion                                                                                                                     | Mobile               |
| Mes listes en cours         | Brouillons et listes prêtes                                                                                                                           | Mobile               |
| Faire ses courses           | Groupée par rayon, cases larges, hors ligne                                                                                                           | Mobile               |
| Historique                  | Listes terminées                                                                                                                                      | Mobile               |
| Paramètres                  | Profil, portions par défaut, mes partages, compte                                                                                                     | Mobile + desktop     |

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
| Hors ligne      | Service worker écrit à la main + IndexedDB via `idb-keyval` (décision 053)                         |

### 9.1 Environnements

- **dev** : local + previews Vercel, branchés sur un projet Supabase « dev » (données de test)
- **prod** : projet Supabase « prod »
- Pas de Supabase local (Docker trop lourd sur la VM)

### 9.2 Intégration IA

- Modèle défini par **variable d'environnement serveur**, modifiable par l'administrateur uniquement
- Lot 5 : test comparatif Haiku / Sonnet sur une dizaine de pages réelles ; choix du modèle de prod ensuite
- Sortie JSON validée par un schéma, avec un indicateur de confiance par champ
- Prompt versionné dans le dépôt : `src/lib/ai/recipe-extraction-prompt.ts` (avec un numéro de version enregistré à chaque import)
- Plafond de dépenses mensuel fixé dans la console Anthropic

### 9.3 Mise en ligne

- GitHub Actions : lint + vérification TypeScript + tests à chaque push ; fusion dans `main` bloquée si échec
- Vercel : preview par branche, production à la fusion dans `main`
- Migrations : testées sur dev, appliquées **à la main** en prod
- Adresse de production : **https://myolva.app** (OVHcloud, DNS chez OVH, DNSSEC ; décision 056) ; `www.myolva.app` redirige vers elle
- Suivi des erreurs : journaux Vercel et Supabase (pas de Sentry pour l'instant)

### 9.4 Sauvegardes

- Export automatique de la base prod par GitHub Actions (planifié), stocké hors Supabase
- Photos sauvegardées séparément [À DÉCIDER : fréquence et emplacement]
- Restauration testée de temps en temps sur le projet dev

---

## 10. Exigences non fonctionnelles

| Domaine       | Exigence                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Hors ligne    | Mode courses consultable et cochable sans réseau                                                   |
| Responsive    | Mobile d'abord ; largeur min. 360 px                                                               |
| Accessibilité | Contrastes lisibles, cibles tactiles ≥ 44 px, texte agrandissable, navigation clavier sur desktop  |
| Mode sombre   | Suit le réglage du téléphone                                                                       |
| Langue        | Français                                                                                           |
| Photos        | Compressées côté client (~1 600 px) ; taille max par photo [À COMPLÉTER]                           |
| Budget        | Domaine ~22 €/an TTC (myolva.app) + API Claude plafonnée ; plans gratuits Vercel, Supabase, GitHub |

---

## 11. Sécurité et données personnelles

- Row Level Security sur toutes les tables (mes données + ce qui m'est partagé)
- Secrets (clé API Claude, clé service Supabase) uniquement en variables d'environnement ; `.env*` dans `.gitignore`
- Données hébergées en UE (région Supabase choisie au lot 0)
- Aucune donnée personnelle dans les journaux
- Suppression de compte au MVP ; export des données après MVP
- Photos de livres : usage privé ; politique de conservation à revoir avant toute ouverture au public
- Avant ouverture au public : politique de confidentialité, CGU, mentions légales, passage aux plans payants (usage commercial interdit sur Vercel Hobby), **publication de l'app Google OAuth** (aujourd'hui en mode test : connexion Google limitée aux comptes ajoutés comme testeurs)

---

## 12. Découpage en lots

> Chaque lot se termine par une démo déployée. Avancement suivi dans GitHub Projects.

> Claude Code écrit le code ; mon rôle : valider les plans, tester, comprendre. Les notions listées sont celles à comprendre pendant le lot (explications de Claude + vidéos/tutoriels si besoin), pas des prérequis bloquants.

| Lot  | Contenu                                                                                                                                                                                                                                          | Stories                                                                 | Notions à comprendre                                                  | Repère indicatif               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| 0    | Setup : dépôt, Next.js + TS, ESLint/Prettier, Vitest, CI GitHub Actions, Supabase dev + prod (UE), CLI migrations, Vercel, sauvegarde automatique                                                                                                | —                                                                       | Structure d'un projet Next.js, npm, variables d'environnement, CI     | ✅ oct.                        |
| 1    | Comptes et profil : connexion Google + email/mot de passe, mot de passe oublié, profil (nom affiché, portions par défaut), parcours d'accueil, suppression de compte, RLS                                                                        | US-CPT-01, US-CPT-02 (sans exemples), US-CPT-04                         | Authentification, Row Level Security, fonctions SQL                   | ✅ oct.                        |
| 2    | Catalogue (rayons, articles, unités, conversions, catalogue initial généré) + recettes manuelles, collections, recherche, photo d'illustration ; recettes d'exemple ; **partage des recettes** (une ou toutes, lecture), copie, « Mes partages » | US-CAT-01/02/04, US-REC-01/03/04/05/06, US-CPT-02 (exemples), US-CPT-03 | Composants React, formulaires, SQL et relations entre tables          | ✅ 2 nov. · date cible révisée |
| 3    | Créer une liste — étapes 1 et 2 : recettes, portions, regroupement, conversions, **revue des ingrédients** (ajuster, retirer, ingrédients de base)                                                                                               | US-LST-01/02/05                                                         | Fonctions pures et tests, état d'un formulaire                        | ✅ 2 nov.                      |
| 4    | Créer une liste — étape 3 : pré-liste, articles libres ; personnalisation catalogue ; listes en cours ; **partage des listes** (co-édition, partage automatique)                                                                                 | US-LST-03/04/06/07, US-CAT-03                                           | Formulaires, état d'un parcours en plusieurs étapes                   | ✅ 3 nov. · date cible révisée |
| 5    | Import photo IA + test Haiku/Sonnet ; import par lien                                                                                                                                                                                            | US-REC-02, US-REC-07                                                    | async/await, appels d'API côté serveur                                | ✅ 3 nov.                      |
| 6    | Faire ses courses : liste par rayon, temps réel entre co-acheteurs, PWA hors ligne, report, historique ; achat du domaine                                                                                                                        | US-CRS-*                                                                | Temps réel, service workers, stockage hors ligne                      | début déc. · Playwright        |
| 7    | ~~Import des ~100 recettes du Sheets (CSV → base, correspondance des ingrédients assistée par IA, liste des cas non résolus)~~ — **abandonné** (décision 067)                                                                                    | —                                                                       | Scripts de migration de données                                       | mi-déc.                        |
| 7bis | **Menus** (décision 068) : menus de la semaine, liste créée depuis un menu, liste sans recette, « Ajouter à la liste »                                                                                                                           | US-MEN-01 à 05, US-LST-08                                               | Migrations, réutiliser un composant, fusion de listes (fonction pure) | nov.                           |
| 8    | Période d'usage : 4 semaines, corrections uniquement                                                                                                                                                                                             | —                                                                       | —                                                                     | mi-déc. → mi-janv.             |

**Fin du MVP** = lots 0 à 6 et 7bis livrés (le lot 7 est abandonné, décision 067 ; le lot 8, commencé le 07/11, est mis en pause pour le lot 7bis et ses 4 semaines repartent de zéro ensuite, décision 068) **et** 4 semaines de courses avec l'app sans le Sheets (lot 8). Pendant le lot 8, aucune nouvelle fonctionnalité : les idées vont en issues étiquetées `post-mvp`.

**Date cible du MVP** : **15/01/2027** (révisée après le lot 4, décision 047 ; auparavant 31/01/2027, puis 28/02/2027). Lots 5 à 7 d'ici mi-décembre, puis les 4 semaines d'usage pendant les fêtes et début janvier.
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

| #   | Date       | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Alternatives écartées                                                                                  |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 001 | 2026-10-25 | TypeScript, mode peu strict au départ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | JavaScript ; JS puis TS                                                                                |
| 002 | 2026-10-25 | ESLint + Prettier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Biome ; Prettier seul                                                                                  |
| 003 | 2026-10-25 | Vitest, logique métier en priorité                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Jest                                                                                                   |
| 004 | 2026-10-25 | GitHub Issues + Projects ; SPEC.md comme référence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Notion ; Todoist ; SPEC seul                                                                           |
| 005 | 2026-10-25 | CLAUDE.md court + SPEC.md ; dossier `docs/` plus tard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Tout dans SPEC                                                                                         |
| 006 | 2026-10-25 | Migrations SQL via le CLI Supabase                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Interface web ; ORM                                                                                    |
| 007 | 2026-10-25 | Photos d'import conservées, compression côté client, miniatures                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Suppression après analyse ; photos brutes                                                              |
| 008 | 2026-10-25 | Plan gratuit + sauvegarde via GitHub Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Supabase Pro ; export manuel                                                                           |
| 009 | 2026-10-25 | Catalogue commun + personnalisations par utilisateur (initialement par foyer, cf. 034) ; base initiale générée par IA                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Catalogue unique ; par foyer ; reprise du Sheets                                                       |
| 010 | 2026-10-25 | Recettes du Sheets importées par script CSV                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Réimport par photo ; ressaisie                                                                         |
| 011 | 2026-10-25 | Environnements dev + prod                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Prod seule ; 3 environnements                                                                          |
| 012 | 2026-10-25 | `*.vercel.app` puis domaine perso avant fin lot 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Domaine dès le départ                                                                                  |
| 013 | 2026-10-25 | CI bloquante ; migrations prod manuelles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Vercel seul ; migrations auto                                                                          |
| 014 | 2026-10-25 | Journaux Vercel/Supabase uniquement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Sentry                                                                                                 |
| 015 | 2026-10-25 | Temps réel + « coché gagne » hors ligne                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Rafraîchissement manuel ; détection de conflits                                                        |
| 016 | 2026-10-25 | ~~Lien d'invitation 7 jours ; propriétaire + membres~~ (remplacée par 034)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Code ; email ; tous égaux                                                                              |
| 017 | 2026-10-25 | Modèle IA configurable (admin) ; test Haiku/Sonnet ; plafond console                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Quota par utilisateur (post-MVP)                                                                       |
| 018 | 2026-10-26 | Réessai + bascule saisie manuelle ; champs douteux surlignés                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | File d'attente auto ; relecture sans indication                                                        |
| 019 | 2026-10-26 | Parcours d'accueil + recettes d'exemple                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Rien ; accueil sans exemples                                                                           |
| 020 | 2026-10-26 | Tailwind CSS + shadcn/ui                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CSS Modules ; Material UI / Mantine                                                                    |
| 021 | 2026-10-26 | Mode sombre auto, socle accessibilité, pas de notifications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Clair seul ; push au MVP                                                                               |
| 022 | 2026-10-26 | Bonnes pratiques RGPD dès le MVP (UE, suppression)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Rien ; conformité complète                                                                             |
| 023 | 2026-10-26 | Jalons sans dates + date cible MVP                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Planning daté par lot                                                                                  |
| 024 | 2026-10-26 | Fin MVP = lots livrés + 4 semaines d'usage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Critère fonctionnel ou d'usage seul                                                                    |
| 025 | 2026-10-26 | Claude Code écrit tout le code et l'explique ; je valide et comprends                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Écrire moi-même certaines parties                                                                      |
| 026 | 2026-10-26 | Date cible MVP : 28/02/2027                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                      |
| 027 | 2026-10-26 | Nom provisoire : Olva                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                                      |
| 028 | 2026-10-26 | ~~Suppression du compte propriétaire : transfert de propriété~~ (remplacée par 034)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Suppression du foyer                                                                                   |
| 029 | 2026-10-26 | Direction visuelle inspirée de Notion, blanc et nuances de bleu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                      |
| 030 | 2026-10-26 | Connexion : Google + email/mot de passe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Lien magique (problème PWA) ; code par email                                                           |
| 033 | 2026-10-29 | Lots 1 et 2 inversés : comptes avant catalogue et recettes (sécurité en place dès la première recette)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Foyer de test avec RLS ouverte temporairement                                                          |
| 034 | 2026-10-30 | **Abandon du foyer** : données par utilisateur ; partage des recettes en lecture (une ou toute la bibliothèque, avec copie) et des listes en co-édition (avec partage automatique) ; par lien 7 jours ou email. Remplace les décisions 016 et 028                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Foyer avec propriétaire et membres                                                                     |
| 035 | 2026-10-30 | Étape 2 = **revue des ingrédients** (ajuster, retirer) ; l'étape « placard » y est fusionnée ; « produit de placard » devient « ingrédient de base » (décoché par défaut, acheté à l'unité de conditionnement)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Étape placard séparée ; suppression de la notion                                                       |
| 036 | 2026-10-31 | Modifier / Supprimer depuis la liste : menu ⋯ au survol (ordinateur), glissement à gauche façon Outlook (mobile) ; suppression toujours confirmée ; bouton Supprimer conservé dans le formulaire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Suppression immédiate avec « Annuler »                                                                 |
| 037 | 2026-10-31 | Fiche recette : le sélecteur de personnes démarre aux **portions par défaut** du profil (consultation seule, la recette n'est pas modifiée) ; quantités exactes sur la fiche (« 1,5 œuf »), **arrondies au supérieur dans la liste de courses** pour les unités comptées                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Démarrer au nombre de personnes de la recette                                                          |
| 038 | 2026-10-31 | Recettes d'exemple : 4 recettes (quiche lorraine, gratin dauphinois, curry de poulet coco, crêpes), sans photo, créées à l'inscription et ajoutées aux comptes existants ; un exemple modifié devient une recette normale ; bandeau « Supprimer les exemples » dans Mes recettes                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Exemples conservés après modification ; nouveaux comptes seulement                                     |
| 039 | 2026-11-01 | Partage des recettes : email d'un compte inexistant → message « aucun compte, envoyez un lien » ; un lien s'accepte par un clic (« Ajouter à mes recettes »), jamais à l'ouverture (aperçus WhatsApp/iMessage) ; les recettes d'exemple ne se partagent pas ; pas d'email de notification avant le SMTP ; le lien n'est stocké que sous forme d'empreinte (SHA-256)                                                                                                                                                                                                                                                                                                                                                                       | Réponse neutre sur l'email ; acceptation automatique à l'ouverture                                     |
| 040 | 2026-11-01 | Copie d'une recette partagée : même titre ; une seule copie par recette (la fiche de l'original propose « Voir ma copie ») ; photo copiée dans mon dossier ; articles personnels de l'autre remplacés par mon article du même nom, sinon copiés avec leurs conversions ; collections non copiées                                                                                                                                                                                                                                                                                                                                                                                                                                          | Titre suffixé « (copie) » ; copies multiples                                                           |
| 041 | 2026-11-02 | Date cible MVP avancée au **31/01/2027** (lot 2 terminé le 2 nov., un mois d'avance) : lots 3 à 7 d'ici fin décembre, usage en janvier ; révision après le lot 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Garder le 28/02/2027 ; 15/01/2027                                                                      |
| 042 | 2026-11-02 | Lot 3 : liste enregistrée en base dès l'étape 1 (brouillon repris automatiquement jusqu'au lot 4) ; sommes affichées dans l'unité de l'article, en kg / l au-delà de 1 000 ; revue triée par rayon, ingrédients de base à la fin ; pas « − + » selon l'unité (1, 10 cl, 50 g/ml, 0,5 kg/l) ; « au goût » n'ajoute rien si une quantité est déjà prévue                                                                                                                                                                                                                                                                                                                                                                                    | Liste gardée dans le navigateur jusqu'au lot 4 ; ordre des recettes ou alphabétique                    |
| 043 | 2026-11-02 | Retours d'Alex sur le lot 3 : filtre par collection à l'étape 1 ; à l'étape 2, unité modifiable sur chaque ligne (quantité convertie si possible) ; passage automatique g ↔ kg et ml ↔ l après un ajustement ; ingrédients de base affichés avec la quantité réellement demandée entre parenthèses (« Sucre (100 g) — 1 paquet »)                                                                                                                                                                                                                                                                                                                                                                                                         | Quantité seule modifiable                                                                              |
| 044 | 2026-11-02 | Lot 4 : « Nouvelle liste » crée toujours une nouvelle liste (les brouillons se reprennent dans « Mes listes en cours ») ; chaque liste a son adresse `/listes/[id]` ; une fois « prête », les étapes 1 à 3 sont fermées et la liste se modifie sur sa page ; seule une liste prête se partage ; pré-liste préremplie d'une quinzaine d'articles courants                                                                                                                                                                                                                                                                                                                                                                                  | Reprise automatique du dernier brouillon ; pré-liste vide                                              |
| 045 | 2026-11-02 | Partage des listes : co-édition des articles (ajouter, retirer, modifier) ; seul le créateur partage, supprime la liste ou retire un partage ; « Partager automatiquement mes nouvelles listes » appliqué à chaque liste terminée (pas aux listes existantes) ; réglé depuis Paramètres → Mes partages                                                                                                                                                                                                                                                                                                                                                                                                                                    | Partage automatique rétroactif                                                                         |
| 046 | 2026-11-02 | « Mon catalogue » dans Paramètres : rayon, ingrédient de base (+ conditionnement) et conversions personnalisés ; personnalisation d'un article commun stockée à part (`item_overrides`), le catalogue commun ne change pas ; une liste partagée suit les rayons de son créateur (ses co-éditeurs lisent ses personnalisations)                                                                                                                                                                                                                                                                                                                                                                                                            | Copie personnelle de l'article commun                                                                  |
| 047 | 2026-11-03 | Date cible MVP avancée au **15/01/2027** (lots 3 et 4 finis le 3 nov., ~3 semaines d'avance) ; **Playwright introduit au début du lot 6** (hors ligne, temps réel entre deux téléphones), avec un compte de test dont le mot de passe est un secret GitHub                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Garder le 31/01 ; 31/12 ; Playwright tout de suite ; pas de Playwright                                 |
| 048 | 2026-11-03 | Lot 5 : bibliothèque officielle `@anthropic-ai/sdk` (version exacte, au moins une semaine d'ancienneté) ; réponse forcée par un « outil » au format JSON Schema, revérifiée par zod ; prompt en fichier TypeScript versionné ; choix du modèle à chaque import sur les aperçus seulement, modèle de prod par variable `OLVA_AI_MODEL`                                                                                                                                                                                                                                                                                                                                                                                                     | `fetch` sans dépendance ; prompt en Markdown lu à l'exécution                                          |
| 049 | 2026-11-03 | Import photo : **jusqu'à 3 pages** par recette, envoyées ensemble à l'IA en une seule demande (prompt v2) ; `recipe_imports.photo_paths` (tableau) remplace `photo_path` ; la photo de présentation reste ajoutée à part, dans la section « Photo » du brouillon                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Une seule page ; page photographiée utilisée comme photo de présentation                               |
| 050 | 2026-11-03 | **Import de recette par lien (US-REC-07) ajouté au MVP, lot 5 (PR 4)** : retiré des non-objectifs ; lecture côté serveur (schema.org Recipe, sinon texte de la page), puis l'IA en mode texte remplit le même brouillon que l'import photo ; ~3 semaines d'avance, mécanique réutilisée                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Garder l'import par lien après le MVP                                                                  |
| 051 | 2026-11-03 | Comparatif Haiku / Sonnet (lot 5) : pas de différence visible sur les pages testées ; **Haiku retenu en production** (valeur par défaut, `OLVA_AI_MODEL` non renseignée) ; Sonnet 5.5 refuse la réponse forcée par outil (`tool_choice` « tool ») : appel en mode « auto » pour ce modèle                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Sonnet en production                                                                                   |
| 052 | 2026-11-03 | Retours d'Alex sur le lot 5 : **lien de la page** modifiable dans « Livre et collections » pour toute recette (pré-rempli par l'import par lien, http/https seulement) ; en créant un article depuis le brouillon, l'unité lue sur la recette n'est plus remplacée par l'unité habituelle de l'article                                                                                                                                                                                                                                                                                                                                                                                                                                    | Lien en lecture seule, réservé aux imports                                                             |
| 053 | 2026-11-03 | Lot 6 en 4 PR (Playwright ; mode courses en ligne + temps réel ; hors ligne + PWA ; fin des courses). Hors ligne : **service worker écrit à la main + `idb-keyval`** ; articles reportés proposés dans la **pré-liste** de la liste suivante (marqués « Reporté ») ; historique dans un onglet **« Terminées »** de Mes listes. Playwright en CI sur l'app construite, branchée sur Supabase dev, avec un compte de test                                                                                                                                                                                                                                                                                                                  | Serwist ; IndexedDB sans bibliothèque ; report direct dans la liste ; historique dans Paramètres       |
| 054 | 2026-11-04 | Hors ligne (lot 6.3) : une liste ouverte une fois avec réseau reste consultable et cochable ; coches en file d'attente (IndexedDB), envoyées au retour du réseau ; décocher hors ligne seulement une coche pas encore envoyée ; pas d'ajout d'article hors ligne ; l'écran de courses demande au service worker de garder sa page ; tout est effacé à la déconnexion. App installable, ouverture sur l'**accueil** ; icône provisoire jusqu'au nom définitif                                                                                                                                                                                                                                                                              | Ouverture sur « Faire ses courses » ; ajout d'articles hors ligne                                      |
| 055 | 2026-11-04 | Fin des courses (lot 6.4) : « Terminer » par le créateur ou un co-éditeur, en ligne et une fois les coches envoyées ; les non-cochés vont dans la réserve à reporter du **créateur** (`carryover_items`), proposés cochés par défaut à l'étape 3 de la liste suivante, réserve vidée quand cette liste est terminée ; l'autre téléphone est prévenu en temps réel. Historique : onglets « En cours » / « Terminées », récapitulatif en lecture seule. **Nom définitif : Olva**                                                                                                                                                                                                                                                            | Report au co-éditeur qui termine ; report direct dans la liste                                         |
| 056 | 2026-11-05 | Domaine **myolva.app** (olva.fr et olva.app pris) chez OVHcloud : 1 an, renouvellement automatique (~18 € HT/an), DNS OVH + DNSSEC, coordonnées masquées ; A → Vercel, `www` redirigé ; Supabase prod : Site URL et Redirect URLs mises à jour. Budget revu (domaine ~22 € TTC/an + API plafonnée)                                                                                                                                                                                                                                                                                                                                                                                                                                        | monolva.fr, olva.eu ; DNS Vercel                                                                       |
| 057 | 2026-11-05 | Trop d'ingrédients non reconnus (aucun synonyme, comparaison exacte) : **US-CAT-05**, avant le lot 7, en 3 PR — (1) catalogue ~720 articles, **noms simples** pour les articles de base, ~725 synonymes communs (relus par Alex) ; (2) synonymes personnels appris des rattachements, priorité à la correspondance avec accents (« pâtes » ≠ « Pâté ») ; (3) IA en dernier recours à l'import (choix parmi des candidats, « À vérifier ») et rayon + unités pré-remplis pour un nouvel article                                                                                                                                                                                                                                            | Catalogue de 2 000 articles ; IA seule                                                                 |
| 058 | 2026-11-05 | Révision de la 057 après analyse de 2 imports (doutes surtout sur les quantités) : **lecture guidée par le catalogue** — le catalogue (nom + unité habituelle) est envoyé à Claude, qui choisit l'article exact, donne la quantité dans l'unité de l'article quand la recette le permet et propose un nouvel article pré-rempli (rayon, unités) ; bloc commun mis en cache (prompt caching) ; « doute » réservé à la lecture illisible, « proposé » pour un article choisi sans correspondance évidente (mention discrète, sans action) ; titre nettoyé ; prompt v4. Remplace l'IA en dernier recours. PR 3 : poids moyens par pièce et conversions automatiques, « Tout accepter », synonymes personnels, « pâtes » ≠ « Pâté »           | Second appel IA pour les non-reconnus                                                                  |
| 059 | 2026-11-05 | US-CAT-05, PR 3 : **poids moyens par pièce** (101 conversions de plus, relues par Alex, 135 au total) et **conversion automatique à l'import** entre familles d'unités seulement (pièces ↔ g, tranches ↔ g ; « 500 g » reste « 500 g » pour un article en kg), arrondie à la demi-pièce, jamais sous une demi-pièce, quantité d'origine en note ; **synonymes personnels** (`my_item_aliases`, RLS : les miens seulement) appris à l'enregistrement d'une recette importée dont j'ai changé un article, prioritaires sur le choix de Claude ; **accents** : correspondance exacte d'abord, tolérance seulement pour un mot sans aucun accent. **« Tout accepter » abandonné** : les articles « proposés » ne demandent déjà aucune action | Bouton « Tout accepter » ; conversion par Claude seule (résultats inconstants)                         |
| 060 | 2026-11-05 | **Enregistrement direct à l'import** (révise US-REC-02 et US-REC-07, « rien sans validation ») : si titre, nombre de personnes et lectures sont sûrs et que chaque ingrédient a un article (ou un nouvel article pré-rempli, créé automatiquement), la recette est enregistrée et sa fiche s'ouvre avec un bandeau (articles proposés rappelés, « Modifier », « Annuler l'import ») ; au moindre doute, le brouillon s'ouvre comme avant. Même chemin d'enregistrement que le formulaire (créer l'article, vérifier, photo, `saveRecipe`). Un lien déjà importé ouvre la recette existante, avant tout appel à Claude                                                                                                                     | Toujours enregistrer, doutes signalés sur la fiche ; toujours le brouillon                             |
| 061 | 2026-11-05 | Consolidation avant l'enregistrement automatique : **un seul module « mon catalogue »** (`src/lib/my-catalogue.ts`) lit et combine articles, personnalisations, conversions et synonymes (les miens d'abord), utilisé par la revue, l'étape 3, la liste, la fin des courses, l'ajout à une liste et l'import. Corrige au passage la fin des courses et l'ajout à une liste, qui ne donnaient pas la priorité à mes conversions. L'écran « Mon catalogue » garde sa lecture directe (il modifie les lignes une par une). Note d'architecture : `docs/architecture.md`                                                                                                                                                                      | Une copie de la lecture par écran                                                                      |
| 062 | 2026-11-05 | Révision de la 049 : à l'import photo, l'IA repère la photo du plat sans texte de recette (`cover_page`, prompt v5) ; elle devient la **photo de couverture** (fichier d'origine, compressé comme une photo choisie à la main), n'est pas lue et n'est pas rangée avec les pages du livre. Il faut au moins 2 photos : une photo de plat seule reste « pas une recette ». Pas de migration (le numéro est gardé dans `recipe_imports.result`)                                                                                                                                                                                                                                                                                             | Photo de présentation toujours ajoutée à part (049)                                                    |
| 063 | 2026-11-06 | « Mes recettes » et le choix des recettes de l'étape 1 sont **par ordre alphabétique** (une seule fonction pure, `sortByTitle` : accents, ligatures et majuscules ignorés, nombres lus comme des nombres), y compris pendant une recherche                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Les plus récentes d'abord                                                                              |
| 064 | 2026-11-06 | **« Créer une recette » depuis l'étape 1** : la sélection en cours est enregistrée (liste créée si besoin), l'écran de création garde la liste d'origine (`?liste=`), puis l'action `addRecipeToList` coche la recette côté serveur (portions par défaut, pas de doublon, liste prête refusée) et l'étape 1 s'ouvre avec le message « créée et ajoutée ». Vaut pour la saisie à la main, l'import (direct ou brouillon) et un lien déjà importé                                                                                                                                                                                                                                                                                           | Cocher la recette côté écran au retour                                                                 |
| 065 | 2026-11-06 | **Partage vers Olva** : `share_target` du manifest (Android, app installée) et Raccourci iOS (Apple ne permet pas à une app web d'apparaître dans « Partager ») arrivent sur `/recettes/partage`, qui retrouve le lien dans le texte reçu (paramètres de suivi retirés) et ouvre « Depuis un lien », où la lecture démarre seule. **Instagram** : la description de partage (`og:description`) est lue quand elle est publique ; sinon, message dédié et mode **« Coller le texte »** (`importRecipeFromText`). Migration : `recipe_imports.pasted_text` (troisième source d'import)                                                                                                                                                      | App native ; contourner la connexion Instagram                                                         |
| 066 | 2026-11-07 | **Emails** : envoi par **Resend** (SMTP, région Irlande) depuis `Olva <bonjour@myolva.app>` sur la prod (DKIM et SPF via CNAME chez OVH, DMARC `p=none`, réception désactivée). **Modèles en français** dans `supabase/templates/` (confirmation d'inscription, réinitialisation, notification « mot de passe modifié »), liens au format `token_hash` (valables depuis n'importe quel navigateur), collés à la main dans Supabase prod. Le projet dev garde l'envoi par défaut de Supabase                                                                                                                                                                                                                                               | Envoi par défaut de Supabase (anglais, limité, liens liés au navigateur)                               |
| 067 | 2026-11-07 | **Lot 7 abandonné** : pas d'import des recettes du Sheets ; les recettes seront ajoutées au fil de l'eau (import par lien, photo, texte collé, saisie). Les lots 0 à 6 sont livrés : début du **lot 8** (4 semaines d'usage, corrections uniquement, idées en issues `post-mvp`)                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Import CSV assisté par IA                                                                              |
| 068 | 2026-11-07 | **Menus de la semaine** à la place de « Créer une liste » : un menu = des recettes + portions, **sans jours** ; la liste se crée depuis le menu et commence à la revue (l'étape 1 disparaît) ; une recette ajoutée au menu après coup → bouton « Ajouter à la liste » (fusion dans la liste, même prête), pas de mise à jour automatique ; menus **non partagés** ; « Dupliquer » un menu ; supprimer un menu garde sa liste ; « Nouvelle liste » dans Mes listes = liste sans recette. **Lot 8 mis en pause** : les menus sont livrés en lot 7bis (4 PR), puis les 4 semaines d'usage repartent de zéro                                                                                                                                  | Menus en issue `post-mvp` ; jours de la semaine ; menus partagés ; mise à jour automatique de la liste |
| 069 | 2026-11-07 | Retours d'Alex sur les menus : un menu se compose dans un **formulaire** (« Enregistrer le menu » / « Enregistrer et créer la liste », plus d'enregistrement automatique, rien de créé avant de valider) et se consulte sur une **fiche** qui n'affiche que ses recettes (portions et retrait par recette ; Modifier, Supprimer le menu ; créer ou voir la liste), sur le modèle des recettes. US-MEN-05                                                                                                                                                                                                                                                                                                                                  | Écran unique avec toutes les recettes et enregistrement automatique (décision 068)                     |

---

## 15. Questions ouvertes

- [x] Service d'envoi d'emails (SMTP) : **Resend**, depuis `bonjour@myolva.app`, avec des modèles en français (décision 066, 07/11/2026)
- [x] Nom définitif : **Olva** (décision 055, 04/11/2026)
- [ ] Playwright (lot 4)
- [ ] Typographie et teintes exactes de bleu
- [ ] Sauvegarde des photos : fréquence et emplacement

---

## 16. Glossaire

| Terme                 | Définition                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Partage               | Accès donné à un autre utilisateur : recette en lecture, liste en co-édition                                                      |
| Catalogue             | Référentiel des articles (commun + articles et personnalisations de chaque utilisateur)                                           |
| Rayon                 | Zone du magasin ; détermine le tri de la liste                                                                                    |
| Ingrédient de base    | Ingrédient courant (huile, sel, épices…) : décoché par défaut dans la revue ; s'il est coché, acheté à l'unité de conditionnement |
| Revue des ingrédients | Étape 2 : ingrédients calculés depuis les recettes, à ajuster ou retirer avant de compléter la liste                              |
| Pré-liste             | Liste de mes articles habituels, passée en revue à l'étape 3 pour ne rien oublier                                                 |
| Collection            | Groupe de recettes (ex. « Plats d'hiver »)                                                                                        |
| Report                | Article non coché, reporté automatiquement sur la liste suivante                                                                  |
