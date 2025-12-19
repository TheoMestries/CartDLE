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
  // Dàin — PATHFINDER (S1), 8e carte de la collection
  { cardId: '1-4-008', imagePath: 'cards/altered/1.png', cardName: 'Dàin', collectionName: 'PATHFINDER' },

  // Vander Warwick — Arcane Saison 2 (S2), 8e carte
  { cardId: '2-9-008', imagePath: 'cards/altered/2.png', cardName: 'Vander Warwick', collectionName: 'Arcane Saison 2' },

  // Salle de sport — One Shot (S1), 18e carte
  { cardId: '1-7-018', imagePath: 'cards/altered/3.png', cardName: 'Salle de sport', collectionName: 'One Shot' },

  // Sona — League (S2), 13e carte
  { cardId: '2-8-013', imagePath: 'cards/altered/4.png', cardName: 'Sona', collectionName: 'League des Légendes' },

  // Eldric — Chroniques de Leif (S1), 10e carte
  { cardId: '1-6-010', imagePath: 'cards/altered/5.png', cardName: 'Eldric', collectionName: 'Chroniques de Leif' },

  // Plateau de cocktails — Taverne (S2, été), 5e carte
  { cardId: '2-1-005', imagePath: 'cards/altered/6.png', cardName: 'Plateau de cocktails', collectionName: 'Taverne Été' },

  // Astoria — RNP (S1), 1ʳᵉ carte
  { cardId: '1-5-001', imagePath: 'cards/altered/7.png', cardName: 'Astoria', collectionName: 'RNP' },

  // Bartholomiew — One Shot (S1), 32e carte
  { cardId: '1-7-032', imagePath: 'cards/altered/8.png', cardName: 'Bartholomiew', collectionName: 'One Shot' },

  // Le 3D — Lieu IRL (S2), 19e carte
  { cardId: '2-10-019', imagePath: 'cards/altered/9.png', cardName: 'Le 3D', collectionName: 'Lieu IRL' },

  // Yara — The Last Of Us (S2), 18e carte
  { cardId: '2-11-018', imagePath: 'cards/altered/10.png', cardName: 'Yara', collectionName: 'The Last Of Us' },

  // Lira Altherion — One Shot (S1), 6e carte
  { cardId: '1-7-006', imagePath: 'cards/altered/11.png', cardName: 'Lira Altherion', collectionName: 'One Shot' },

  // Catherine de Médicis — Civilization VI (S2), 6e carte
  { cardId: '2-12-006', imagePath: 'cards/altered/12.png', cardName: 'Catherine de Médicis', collectionName: 'CIVILIZATION VI' },

  // Lotus — Warframe (S2), 2e carte
  { cardId: '2-3-002', imagePath: 'cards/altered/13.png', cardName: 'Lotus', collectionName: 'Warframe' },

  // Kayn — League (S2), 35e carte
  { cardId: '2-8-035', imagePath: 'cards/altered/14.png', cardName: 'Kayn', collectionName: 'League des Légendes' },

  // L’électricien — Meme Discord (S2), 4e carte
  { cardId: '2-13-004', imagePath: 'cards/altered/15.png', cardName: 'L’électricien', collectionName: 'MEME DISCORD' },

  // Captain Hek — Warframe (S2), 39e carte
  { cardId: '2-3-039', imagePath: 'cards/altered/16.png', cardName: 'Captain Hek', collectionName: 'Warframe' },

  // Tommy — The Last Of Us (S2), 4e carte
  { cardId: '2-11-004', imagePath: 'cards/altered/17.png', cardName: 'Tommy', collectionName: 'The Last Of Us' },

  // Amaluia — One Shot (S1), 26e carte
  { cardId: '1-7-026', imagePath: 'cards/altered/18.png', cardName: 'Amaluia', collectionName: 'One Shot' },

  // Tulle — Lieu IRL (S2), 8e carte
  { cardId: '2-10-008', imagePath: 'cards/altered/19.png', cardName: 'Tulle', collectionName: 'Lieu IRL' },

  // Lux — League (S2), 1ʳᵉ carte
  { cardId: '2-8-001', imagePath: 'cards/altered/20.png', cardName: 'Lux', collectionName: 'League des Légendes' },

  // Silco — Arcane (S1), 5e carte
  { cardId: '1-2-005', imagePath: 'cards/altered/21.png', cardName: 'Silco', collectionName: 'Arcane' },

  // Sky — Arcane Saison 2 (S2), 26e carte
  { cardId: '2-9-026', imagePath: 'cards/altered/22.png', cardName: 'Sky', collectionName: 'Arcane Saison 2' },

  // La Cave — Lieu IRL (S2), 7e carte
  { cardId: '2-10-007', imagePath: 'cards/altered/23.png', cardName: 'La Cave', collectionName: 'Lieu IRL' },

  // Scar — Arcane Saison 2 (S2), 29e carte
  { cardId: '2-9-029', imagePath: 'cards/altered/24.png', cardName: 'Scar', collectionName: 'Arcane Saison 2' },

  // Tenno — Warframe (S2), 3e carte
  { cardId: '2-3-003', imagePath: 'cards/altered/25.png', cardName: 'Tenno', collectionName: 'Warframe' },

  // Thresh — League (S2), 7e carte
  { cardId: '2-8-007', imagePath: 'cards/altered/26.png', cardName: 'Thresh', collectionName: 'League des Légendes' },

  // A.X.I.O.M — One Shot (S1), 7e carte
  { cardId: '1-7-007', imagePath: 'cards/altered/27.png', cardName: 'A.X.I.O.M', collectionName: 'One Shot' },

  // Humain — Taverne (S1), 9e carte
  { cardId: '1-1-009', imagePath: 'cards/altered/28.png', cardName: 'Humain', collectionName: 'Taverne' },

  // Chef Ambessa — Arcane Saison 2 (S2), 4e carte
  { cardId: '2-9-004', imagePath: 'cards/altered/29.png', cardName: 'Chef Ambessa', collectionName: 'Arcane Saison 2' },

  // Archibald — Chroniques de Leif (S1), 2e carte
  { cardId: '1-6-002', imagePath: 'cards/altered/30.png', cardName: 'Archibald', collectionName: 'Chroniques de Leif' }
];




export default alternateImages;
