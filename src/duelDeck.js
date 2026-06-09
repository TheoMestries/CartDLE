export function selectBalancedFeaturedCollections(cards, shuffle) {
  const collections = Array.from(groupBy(cards, (card) => `${card.season}:${card.collectionId}`).entries())
    .filter(([, collectionCards]) => collectionCards.length >= 8);
  const collectionsBySeason = groupBy(collections, ([, collectionCards]) => collectionCards[0].season);
  const featured = [];
  const usedCollectionIds = new Set();

  Array.from(collectionsBySeason.keys()).sort().forEach((season) => {
    const seasonCollections = shuffle(collectionsBySeason.get(season));
    const choice = seasonCollections.find(([, collectionCards]) => !usedCollectionIds.has(collectionCards[0].collectionId))
      ?? seasonCollections[0];
    if (choice) {
      featured.push(choice);
      usedCollectionIds.add(choice[1][0].collectionId);
    }
  });
  return featured;
}

export function getArenaCostCurve(amount) {
  const curves = {
    6: [1, 1, 2, 2, 3, 4],
    7: [1, 1, 2, 2, 3, 3, 4],
    8: [1, 1, 2, 2, 3, 3, 4, 5],
  };
  return [...(curves[amount] ?? curves[6].slice(0, amount))];
}

function groupBy(input, selector) {
  const result = new Map();
  input.forEach((entry) => {
    const key = selector(entry);
    if (!result.has(key)) {
      result.set(key, []);
    }
    result.get(key).push(entry);
  });
  return result;
}
