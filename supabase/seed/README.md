# Données de départ du catalogue (à relire avant insertion)

- `catalogue.csv` : articles communs — nom, rayon, unité par défaut (celle des recettes), ingrédient de base (oui/non) et, pour ceux-ci, conditionnement à l'achat (bouteille, paquet, pot…)
- `conversions.csv` : conversions propres à un article — « 1 gousse d'ail = 5 g »

Codes d'unités : g, kg, ml, cl, l, cac (c. à café), cas (c. à soupe), pincee, piece, boite,
sachet, paquet, pot, bouteille, botte, tranche, gousse, brin, feuille.

Une fois relus et validés, ces fichiers sont transformés en migration d'insertion
(catalogue commun : visible par tous, non modifiable par les utilisateurs).
