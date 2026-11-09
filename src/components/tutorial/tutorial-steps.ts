/**
 * Textes du tutoriel de prise en main (US-CPT-06), réunis ici pour les modifier
 * facilement. Une phrase ou deux par bulle : au-delà, on clique sur « Passer ».
 *
 * `target` : valeur de l'attribut `data-tour` de l'élément à mettre en surbrillance
 * (absent = fenêtre centrée, sans surbrillance).
 */
export type TutorialStep = { target?: string; title: string; text: string };

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Bienvenue sur Olva 👋",
    text: "Vos recettes, vos menus et vos courses, réunis dans une seule app. Voici comment elle marche, en quatre menus.",
  },
  {
    target: "nav-recettes",
    title: "1. Recettes",
    text: "Ajoutez vos recettes en photographiant la page d'un livre, ou en partageant le lien d'un site.",
  },
  {
    target: "nav-menus",
    title: "2. Menus",
    text: "Choisissez les recettes de votre semaine : c'est votre menu.",
  },
  {
    target: "nav-listes",
    title: "3. Listes",
    text: "La liste de courses se crée depuis le menu. Votre pré-liste, qui réunit vos achats habituels (lait, café, papier toilette…), s'y ajoute pour ne rien oublier, et vous la configurez à votre goût.",
  },
  {
    target: "nav-courses",
    title: "4. Courses",
    text: "En magasin, cochez les articles au fil des rayons, même à plusieurs grâce au partage.",
  },
  {
    title: "À vous de jouer !",
    text: "Commencez par ajouter votre première recette. Vous pourrez revoir ce tutoriel depuis les Paramètres.",
  },
];

/** Où mène le bouton de la dernière étape : l'import d'une recette en photo. */
export const TUTORIAL_FINAL_HREF = "/recettes/import";
