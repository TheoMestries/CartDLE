import season1Cards from './season1.js';
import season2Cards from './season2.js';
import { rarityLabels, typeLabels } from '../config/constants.js';

const allCollections = [...season1Cards, ...season2Cards];

const cards = allCollections.flatMap((collection) => {
  const collectionSize = collection.cards.length;
  return collection.cards.map((cardEntry) => {
    const [name, description, image, type, rarity] = cardEntry;
    return {
      id: `${collection.collection_id}-${name}`,
      name,
      description,
      image,
      type,
      rarity,
      typeLabel: typeLabels[type] ?? typeLabels.character,
      rarityLabel: rarityLabels[rarity] ?? rarity,
      season: collection.season_id,
      collectionId: collection.collection_id,
      collectionName: collection.collection_name,
      collectionSize,
      collectionImage: collection.collection_image,
      imagePath: computeImagePath(collection.season_id, collection.collection_name, image),
    };
  });
});

export default cards;
export { allCollections };

function computeImagePath(seasonId, collectionName, image) {
  if (!image) {
    return '';
  }

  if (seasonId === 1) {
    return `cards/1/${image}`;
  }

  const slug = slugify(collectionName);
  return `cards/2/${slug}/${image}`;
}

function slugify(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}
