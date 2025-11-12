import cards from './data/index.js';
import {
  rarityOrder,
  rarityLabels,
  typeLabels,
  seasonLabels,
} from './config/constants.js';

const cardLookup = new Map();
const nameLookup = new Map();
const guessedIds = new Set();

const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const feedback = document.getElementById('feedback');
const resultsBody = document.querySelector('#results tbody');
const revealSection = document.getElementById('reveal');
const revealImage = document.getElementById('reveal-image');
const revealName = document.getElementById('reveal-name');
const revealMeta = document.getElementById('reveal-meta');
const revealDescription = document.getElementById('reveal-description');
const datalist = document.getElementById('card-options');

const rarityIndex = new Map(rarityOrder.map((value, index) => [value, index]));

cards.forEach((card) => {
  const uniqueLabel = `${card.name} (${card.collectionName})`;
  const key = normalize(uniqueLabel);
  cardLookup.set(key, card);

  const option = document.createElement('option');
  option.value = uniqueLabel;
  option.label = `${card.collectionName} · ${seasonLabels[card.season] ?? `Saison ${card.season}`}`;
  datalist.appendChild(option);

  const nameKey = normalize(card.name);
  if (!nameLookup.has(nameKey)) {
    nameLookup.set(nameKey, []);
  }
  nameLookup.get(nameKey).push(card);
});

const targetCard = pickDailyCard(cards);

guessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = guessInput.value.trim();
  if (!value) {
    setFeedback('Saisis le nom d\'une carte.');
    return;
  }

  const resolution = resolveGuess(value);
  if (resolution.error) {
    setFeedback(resolution.error, resolution.detail ?? '');
    return;
  }

  const guessCard = resolution.card;
  if (guessedIds.has(guessCard.id)) {
    setFeedback('Tu as déjà essayé cette carte.');
    guessInput.value = '';
    return;
  }

  guessedIds.add(guessCard.id);
  addGuessRow(guessCard, targetCard);
  guessInput.value = '';
  setFeedback('');

  if (guessCard.id === targetCard.id) {
    revealCard(targetCard);
    setFeedback('Bravo ! Tu as trouvé la carte mystère.');
  }
});

revealImage.addEventListener('error', () => {
  revealImage.hidden = true;
});

function resolveGuess(input) {
  const normalized = normalize(input);

  if (cardLookup.has(normalized)) {
    return { card: cardLookup.get(normalized) };
  }

  const matches = nameLookup.get(normalized);
  if (!matches || matches.length === 0) {
    return { error: `Aucune carte trouvée pour \"${input}\".` };
  }

  if (matches.length > 1) {
    const suggestions = matches
      .map((card) => `${card.name} (${card.collectionName})`)
      .join(', ');
    return {
      error: 'Plusieurs cartes portent ce nom.',
      detail: `Précise ta recherche : ${suggestions}.`,
    };
  }

  return { card: matches[0] };
}

function addGuessRow(guessCard, target) {
  const evaluation = evaluateGuess(guessCard, target);
  const row = document.createElement('tr');

  const nameCell = document.createElement('th');
  nameCell.scope = 'row';
  nameCell.textContent = guessCard.name;
  row.appendChild(nameCell);

  row.appendChild(createResultCell(evaluation.season, 'season'));
  row.appendChild(createResultCell(evaluation.collection, 'collection'));
  row.appendChild(createResultCell(evaluation.type, 'type'));
  row.appendChild(createResultCell(evaluation.rarity, 'rarity'));
  row.appendChild(createResultCell(evaluation.collectionSize, 'collectionSize'));

  resultsBody.prepend(row);
}

function createResultCell(result, category) {
  const cell = document.createElement('td');
  const wrapper = document.createElement('span');
  wrapper.classList.add('result-cell', `result-cell--${result.status}`);
  wrapper.title = getResultHint(category, result.status);

  const valueSpan = document.createElement('span');
  valueSpan.textContent = formatResultValue(category, result.value);
  wrapper.appendChild(valueSpan);

  if (result.status !== 'correct') {
    const indicator = document.createElement('span');
    indicator.classList.add('result-cell__indicator');
    indicator.textContent = getIndicator(result.status);
    wrapper.appendChild(indicator);
  }

  cell.appendChild(wrapper);
  return cell;
}

function evaluateGuess(guess, target) {
  const seasonStatus = compareNumbers(guess.season, target.season);
  const guessCollectionLabel = guess.collectionName;
  const targetType = typeLabels[target.type] ?? target.type;
  const guessType = typeLabels[guess.type] ?? guess.type;
  const guessRarityIndex = rarityIndex.get(guess.rarity);
  const targetRarityIndex = rarityIndex.get(target.rarity);
  const rarityStatus = compareNumbers(guessRarityIndex, targetRarityIndex);
  const sizeStatus = compareNumbers(guess.collectionSize, target.collectionSize);

  return {
    season: {
      value: seasonLabels[guess.season] ?? `Saison ${guess.season}`,
      status: seasonStatus,
    },
    collection: {
      value: guessCollectionLabel,
      status:
        guess.collectionId === target.collectionId
          ? 'correct'
          : guess.season === target.season
          ? 'partial'
          : 'incorrect',
    },
    type: {
      value: guessType,
      status: guessType === targetType ? 'correct' : 'incorrect',
    },
    rarity: {
      value: rarityLabels[guess.rarity] ?? guess.rarity,
      status: rarityStatus,
    },
    collectionSize: {
      value: guess.collectionSize,
      status: sizeStatus,
    },
  };
}

function formatResultValue(category, value) {
  if (category === 'collectionSize') {
    return `${value} carte${value > 1 ? 's' : ''}`;
  }
  return value;
}

function getIndicator(status) {
  switch (status) {
    case 'higher':
      return '↑';
    case 'lower':
      return '↓';
    case 'partial':
      return '≈';
    default:
      return '✗';
  }
}

function getResultHint(category, status) {
  if (status === 'correct') {
    return 'Bonne réponse !';
  }

  const hints = {
    season: {
      higher: 'La carte mystère est dans une saison plus récente.',
      lower: 'La carte mystère est dans une saison plus ancienne.',
      incorrect: 'La carte mystère est dans une autre saison.',
    },
    collection: {
      partial: 'Même saison, mais pas la bonne collection.',
      incorrect: 'Ce n\'est pas la bonne collection.',
    },
    type: {
      incorrect: 'Le type ne correspond pas (personnage ou lieu).',
    },
    rarity: {
      higher: 'La carte mystère est de rareté supérieure.',
      lower: 'La carte mystère est de rareté inférieure.',
      incorrect: 'La rareté ne correspond pas.',
    },
    collectionSize: {
      higher: 'La collection de la carte mystère contient plus de cartes.',
      lower: 'La collection de la carte mystère contient moins de cartes.',
      incorrect: 'La taille de la collection ne correspond pas.',
    },
  };

  return hints[category]?.[status] ?? 'Indice indisponible.';
}

function compareNumbers(a, b) {
  if (a === b) {
    return 'correct';
  }
  return a < b ? 'higher' : 'lower';
}

function pickDailyCard(list) {
  const date = new Date();
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  const index = hash % list.length;
  return list[index];
}

function revealCard(card) {
  revealSection.hidden = false;
  revealName.textContent = card.name;
  revealMeta.textContent = `${seasonLabels[card.season] ?? `Saison ${card.season}`} · ${card.collectionName} · ${
    rarityLabels[card.rarity] ?? card.rarity
  }`;
  revealDescription.textContent = card.description;

  if (card.imagePath) {
    revealImage.src = card.imagePath;
    revealImage.alt = card.name;
    revealImage.hidden = false;
  } else {
    revealImage.hidden = true;
  }
}

function setFeedback(message, detail = '') {
  feedback.textContent = [message, detail].filter(Boolean).join(' ');
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
