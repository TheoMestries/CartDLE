# CartDLE

CartDLE est un mini-jeu inspiré de Wordle permettant de deviner une carte de la collection à partir de plusieurs indices :
la saison, la collection, le type (personnage ou lieu), la rareté et la taille de la collection.

## Lancer le jeu

1. Clonez le dépôt puis ouvrez le fichier `index.html` dans votre navigateur préféré.
2. Utilisez la zone de saisie pour rechercher une carte (la liste déroulante propose toutes les cartes disponibles).
3. Comparez les indices pour approcher de la bonne carte. Une nouvelle carte est proposée chaque jour.

Le PvP en ligne fonctionne depuis un hébergement statique grâce à une connexion directe entre les navigateurs.
L’hôte doit garder la page ouverte pendant la partie.

## Indices disponibles

| Indice | Description |
| ------ | ----------- |
| Saison | Indique si la carte fait partie de la même saison (une flèche ↑ ou ↓ indique une saison plus récente ou plus ancienne). |
| Collection | Valide si la collection est correcte. Un symbole ≈ indique la même saison mais pas la bonne collection. |
| Type | Compare le type de carte (personnage ou lieu). |
| Rareté | Compare la rareté (Commune, Rare, Épique, Légendaire) avec indication ↑ ou ↓. |
| Taille de la collection | Compare le nombre total de cartes dans la collection avec des indications ↑ ou ↓. |

Bravo si vous trouvez la carte mystère !

La carte quotidienne alterne équitablement entre les Saisons 1, 2 et 3 avant d’être choisie dans la saison du jour.

## CartDLE Arène

Le mode `duel.html` transforme la collection en jeu de cartes stratégique jouable contre trois niveaux de bots,
à deux joueurs en local ou en PvP en ligne par lien d’invitation. Chaque deck réunit une collection de chaque saison.
Chaque camp construit une escouade de cinq cartes, gère une réserve d'énergie croissante et cherche à réduire le
noyau adverse à zéro.

- Chaque carte reçoit une origine de collection et deux traits déduits de son nom, sa description et son identité propre.
- Réunir `2` ou `4` cartes d'une même collection ou d'un même trait active un nouveau palier de composition.
- Assaut, Rempart, Arcaniste, Soutien, Tireur, Survivant et Stratège produisent des effets de combat différents.
- L'initiative est aléatoire ; les deux joueurs commencent par un déploiement sans combat, puis le premier joueur lance le premier assaut.
- Le second joueur reçoit une carte et une énergie bonus pour préparer sa réplique.
- Chaque carte légendaire possède un pouvoir unique inspiré de son identité et de son univers.
- La Surcharge donne `+2` énergie une fois par partie.
- Une pioche vide inflige des dégâts de fatigue croissants.
- Un salon PvP existe tant que l’hôte garde sa page ouverte.
