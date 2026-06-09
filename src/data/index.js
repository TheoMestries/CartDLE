import season1Cards from './season1.js';
import season2Cards from './season2.js';
import season3Cards from './season3.js';
import { rarityLabels, seasonLabels, typeLabels } from '../config/constants.js';

const collections = [...season1Cards, ...season2Cards, ...season3Cards];
const allCollections = collections;
const collectionMeta = buildCollectionMeta(collections);

const cards = collections.flatMap((collection) => {
  const meta = collectionMeta.get(collection.collection_id);
  const seasonLabel = seasonLabels[collection.season_id] ?? `Saison ${collection.season_id}`;
  return collection.cards
    .map((cardEntry, index) => {
      const [name, description, image, type, rarity] = cardEntry;
      const trimmedDescription = description?.trim();
      if (!trimmedDescription) {
        return null;
      }

      return {
        id: createCardId(collection.season_id, collection.collection_id, index),
        name,
        description: trimmedDescription,
        image,
        type,
        rarity,
        typeLabel: typeLabels[type] ?? typeLabels.character,
        rarityLabel: rarityLabels[rarity] ?? rarity,
        season: collection.season_id,
        seasonLabel,
        seasonGroup: meta.seasonKey,
        seasonGroupLabel: meta.seasonLabel,
        collectionId: collection.collection_id,
        collectionName: collection.collection_name,
        collectionSize: meta.totalSize,
        collectionImage: collection.collection_image,
        imagePath: computeImagePath(
          collection.season_id,
          collection.collection_name,
          image,
          collection.image_root,
          collection.image_folder,
        ),
      };
    })
    .filter(Boolean);
});

export default cards;
export { allCollections };

function buildCollectionMeta(collections) {
  const metaMap = new Map();

  collections.forEach((collection) => {
    if (!metaMap.has(collection.collection_id)) {
      metaMap.set(collection.collection_id, {
        totalSize: 0,
        seasonIds: new Set(),
        seasonLabel: '',
        seasonKey: '',
      });
    }

    const meta = metaMap.get(collection.collection_id);
    meta.totalSize += collection.cards.length;
    meta.seasonIds.add(collection.season_id);
  });

  metaMap.forEach((meta) => {
    const seasons = Array.from(meta.seasonIds).sort((a, b) => a - b);
    meta.seasonKey = seasons.join('-');
    meta.seasonLabel = seasons.length > 1
      ? `Saison ${meta.seasonKey}`
      : seasonLabels[seasons[0]] ?? `Saison ${seasons[0]}`;
  });

  return metaMap;
}

function createCardId(seasonId, collectionId, index) {
  const position = String(index + 1).padStart(3, '0');
  return `${seasonId}-${collectionId}-${position}`;
}

function computeImagePath(seasonId, collectionName, image, imageRoot, imageFolder) {
  if (!image) {
    return '';
  }

  if (seasonId === 1) {
    return `cards/1/${image}`;
  }

  const root = imageRoot ?? `cards/${seasonId}`;
  const folder = imageFolder ?? slugify(collectionName);
  return `${root}/${folder}/${image}`;
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
