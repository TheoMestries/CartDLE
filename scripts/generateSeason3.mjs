import fs from 'fs';
import path from 'path';

const [collectionSqlPath, cardSqlPath, updatesSqlPath, outputPath = 'src/data/season3.js'] = process.argv.slice(2);

if (!collectionSqlPath || !cardSqlPath || !updatesSqlPath) {
  console.error('Usage: node scripts/generateSeason3.mjs <collections.sql> <cards.sql> <updates.sql> [output.js]');
  process.exit(1);
}

const root = process.cwd();
const collectionRows = parseInsert(fs.readFileSync(collectionSqlPath, 'utf8'));
const cardRows = parseInsert(fs.readFileSync(cardSqlPath, 'utf8'));
const updates = parseDescriptionUpdates(fs.readFileSync(updatesSqlPath, 'utf8'));
const imageRoots = new Map([
  ['cards/2', getSeasonFolders(path.join(root, 'cards', '2'))],
  ['cards/3', getSeasonFolders(path.join(root, 'cards', '3'))],
]);
const usedImages = new Set();
const warnings = [];

const supplementalCollections = new Map([
  [8, ['League des Legendes', 'Collection des mains de la League des Légendes', 'collection8.png', 'cards/2']],
  [10, ['Lieu IRL', 'Collection sur les différents lieux IRL', 'collection10.png', 'cards/2']],
  [13, ['MEME DISCORD', 'Collection des memes du discord', 'collection13.png', 'cards/2']],
]);

const imageAliases = new Map([
  ['hope_van_dyne', 'wasp.png'],
  ['castral_roc', 'castralrock.png'],
  ['le_repaire_de_l_homme_a_la_moustache', "Le repaire de l'homme à la moustache.gif"],
  ['la_terreur_des_frigos_,_ygroffe', 'Ygroffe, terreur des frigos.gif'],
]);

const collectionDefinitions = collectionRows.map(([id, name, description, image]) => ({
  collectionId: Number(id),
  name,
  description,
  image,
  imageRoot: 'cards/3',
}));

const configuredIds = new Set(collectionDefinitions.map((collection) => collection.collectionId));
cardRows
  .filter((row) => Number(row[7]) === 3 && !configuredIds.has(Number(row[6])))
  .forEach((row) => {
    const collectionId = Number(row[6]);
    const supplemental = supplementalCollections.get(collectionId);
    if (!supplemental || configuredIds.has(collectionId)) {
      return;
    }
    collectionDefinitions.push({
      collectionId,
      name: supplemental[0],
      description: supplemental[1],
      image: supplemental[2],
      imageRoot: supplemental[3],
    });
    configuredIds.add(collectionId);
  });

const collections = collectionDefinitions.map(({ collectionId, name, description, image, imageRoot }) => {
  const folders = imageRoots.get(imageRoot) ?? [];
  const imageFolder = resolveFolder(name, folders);
  if (!imageFolder) {
    warnings.push(`Dossier introuvable pour la collection ${collectionId} (${name}).`);
  }

  const cards = cardRows
    .filter((row) => Number(row[6]) === collectionId && Number(row[7]) === 3)
    .map(([cardId, type, cardName, cardDescription, cardImage, rarity]) => {
      const normalizedCardId = String(cardId);
      const normalizedImage = String(cardImage);
      const override = updates.get(`${collectionId}:${normalizedCardId}`);
      const resolvedImage = resolveImage(imageFolder, imageAliases.get(normalizedCardId) ?? normalizedImage);
      if (imageFolder && resolvedImage) {
        usedImages.add(`${imageRoot}/${imageFolder.name}/${resolvedImage}`);
      } else {
        warnings.push(`Image introuvable : collection ${collectionId}, carte ${normalizedCardId}, fichier ${normalizedImage}.`);
      }
      return {
        name: String(cardName),
        description: String(override ?? cardDescription),
        image: resolvedImage ?? normalizedImage,
        type: String(type),
        rarity: String(rarity),
      };
    });

  return {
    collectionId,
    name,
    description,
    image,
    imageRoot,
    imageFolder: imageFolder?.name ?? slugify(name),
    cards,
  };
});

const orphanCards = cardRows.filter((row) => Number(row[7]) === 3
  && !collections.some((collection) => collection.collectionId === Number(row[6])));
orphanCards.forEach((row) => warnings.push(`Carte sans collection configurée : ${row[0]} (collection ${row[6]}).`));

imageRoots.get('cards/3').forEach((folder) => {
  folder.images.forEach((image) => {
    if (!usedImages.has(`cards/3/${folder.name}/${image}`)) {
      warnings.push(`Image non utilisée : cards/3/${folder.name}/${image}.`);
    }
  });
});

const output = renderSeason3(collections);
fs.writeFileSync(path.resolve(root, outputPath), output, 'utf8');

console.log(`Saison 3 générée : ${collections.length} collections, ${collections.reduce((sum, collection) => sum + collection.cards.length, 0)} cartes.`);
console.log(`Corrections de description disponibles : ${updates.size}.`);
warnings.forEach((warning) => console.warn(`ATTENTION: ${warning}`));
if (warnings.length) {
  process.exitCode = 2;
}

function parseInsert(sql) {
  const valuesIndex = sql.indexOf('VALUES');
  if (valuesIndex < 0) {
    throw new Error('Clause VALUES introuvable.');
  }

  const rows = [];
  let row = null;
  let value = '';
  let quoted = false;
  let depth = 0;

  for (let index = valuesIndex + 6; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quoted) {
      if (char === "'" && next === "'") {
        value += "'";
        index += 1;
      } else if (char === "'") {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === "'") {
      quoted = true;
    } else if (char === '(') {
      depth += 1;
      if (depth === 1) {
        row = [];
        value = '';
      } else {
        value += char;
      }
    } else if (char === ')' && depth === 1) {
      row.push(parseValue(value));
      rows.push(row);
      row = null;
      value = '';
      depth = 0;
    } else if (char === ')' && depth > 1) {
      depth -= 1;
      value += char;
    } else if (char === ',' && depth === 1) {
      row.push(parseValue(value));
      value = '';
    } else if (depth === 1) {
      value += char;
    }
  }

  return rows;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (trimmed === 'NULL') {
    return null;
  }
  return trimmed;
}

function parseDescriptionUpdates(sql) {
  const updates = new Map();
  const pattern = /SET card_description = '((?:''|[^'])*)'\s*WHERE card_id = '((?:''|[^'])*)' AND collection_id = (\d+) AND season_id = 3;/gs;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const description = match[1].replaceAll("''", "'").replaceAll('\\n', '\n');
    const cardId = match[2].replaceAll("''", "'");
    updates.set(`${Number(match[3])}:${cardId}`, description);
  }
  return updates;
}

function getSeasonFolders(seasonPath) {
  return fs.readdirSync(seasonPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      images: fs.readdirSync(path.join(seasonPath, entry.name))
        .filter((image) => fs.statSync(path.join(seasonPath, entry.name, image)).isFile()),
    }));
}

function resolveFolder(collectionName, folders) {
  const key = slugify(collectionName).replaceAll('_', '');
  return folders.find((folder) => folder.name.replaceAll('_', '') === key) ?? null;
}

function resolveImage(folder, requestedImage) {
  if (!folder) {
    return null;
  }
  return folder.images.find((image) => image.toLowerCase() === String(requestedImage).toLowerCase()) ?? null;
}

function renderSeason3(collections) {
  const lines = [
    "import { CardTypes, CardRarity } from '../config/constants.js';",
    '',
    'const season3Cards = [',
  ];

  collections.forEach((collection) => {
    lines.push('  {');
    lines.push(`    "collection_id": ${collection.collectionId},`);
    lines.push(`    "collection_name": ${JSON.stringify(collection.name)},`);
    lines.push(`    "collection_description": ${JSON.stringify(collection.description)},`);
    lines.push(`    "collection_image": ${JSON.stringify(collection.image)},`);
    lines.push(`    "image_root": ${JSON.stringify(collection.imageRoot)},`);
    lines.push(`    "image_folder": ${JSON.stringify(collection.imageFolder)},`);
    lines.push('    "season_id": 3,');
    lines.push('    "cards": [');
    collection.cards.forEach((card) => {
      lines.push(`      [${JSON.stringify(card.name)}, ${JSON.stringify(card.description)}, ${JSON.stringify(card.image)}, ${renderType(card.type)}, ${renderRarity(card.rarity)}],`);
    });
    lines.push('    ],');
    lines.push('  },');
  });

  lines.push('];', '', 'export default season3Cards;', '');
  return lines.join('\n');
}

function renderType(type) {
  const types = {
    Character: 'CardTypes.Character',
    Classic: 'CardTypes.Classic',
    Location: 'CardTypes.Location',
  };
  if (!types[type]) {
    throw new Error(`Type inconnu : ${type}`);
  }
  return types[type];
}

function renderRarity(rarity) {
  const rarities = {
    Common: 'CardRarity.Common',
    Rare: 'CardRarity.Rare',
    Epic: 'CardRarity.Epic',
    Legendary: 'CardRarity.Legendary',
    Legacy: 'CardRarity.Legacy',
  };
  if (!rarities[rarity]) {
    throw new Error(`Rareté inconnue : ${rarity}`);
  }
  return rarities[rarity];
}

function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}
