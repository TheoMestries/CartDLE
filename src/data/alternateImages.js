// Ajoute ici les visuels alternatifs que tu as préparés.
// Chaque entrée associe l'identifiant d'une carte existante (cardId)
// avec le chemin de ton image (imagePath), son nom affiché (cardName)
// et le nom de la collection (collectionName).
//
// Exemple :
// {
//   cardId: '1-1-001',
//   imagePath: 'cards/alternates/ma_carte_alt.png',
//   cardName: 'Nom de la carte',
//   collectionName: 'Nom de la collection',
// }
//
// Ajoute jusqu'à 30 entrées (ou plus) selon tes besoins.
// Laisse le tableau vide si tu n'as pas encore préparé les visuels.
const alternateImages = [
  // Exemple prêt à l'emploi : remplace les valeurs par ton visuel.
  // Pour trouver l'identifiant de carte (cardId), combine saison-collection-position
  // au format S-C-XXX (ex. 1-1-001 pour la 1ʳᵉ carte de la collection 1 saison 1).
  {
    cardId: '1-1-001',
    imagePath: 'cards/1/taverne.png', // remplace par le chemin vers ton visuel alternatif
    cardName: 'La Taverne', // nom affiché dans le jeu
    collectionName: 'Taverne', // nom de la collection affiché
  },
  // Ajoute tes entrées ici (jusqu’à 30 ou plus) en dupliquant le bloc ci-dessus.
];

export default alternateImages;
