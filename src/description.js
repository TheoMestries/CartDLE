import cards from './data/index.js';
import {
  rarityLabels,
  seasonLabels,
  typeLabels,
} from './config/constants.js';

const descriptionElement = document.getElementById('mystery-description');
const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const feedback = document.getElementById('feedback');
const suggestionsContainer = document.getElementById('guess-suggestions');
const historyList = document.getElementById('guess-history');
const revealSection = document.getElementById('reveal');
const revealImage = document.getElementById('reveal-image');
const revealName = document.getElementById('reveal-name');
const revealMeta = document.getElementById('reveal-meta');
const revealDescription = document.getElementById('reveal-description');

const cardLookup = new Map();
const nameLookup = new Map();
const idLookup = new Map();
const guessedIds = new Set();

cards.forEach((card) => {
  const uniqueLabel = `${card.name} (${card.collectionName})`;
  cardLookup.set(normalize(uniqueLabel), card);
  idLookup.set(card.id, card);

  const normalizedName = normalize(card.name);
  if (!nameLookup.has(normalizedName)) {
    nameLookup.set(normalizedName, []);
  }
  nameLookup.get(normalizedName).push(card);
});

const targetCard = pickDailyCard(cards, 'description');
descriptionElement.textContent = targetCard.description;

if (revealImage) {
  revealImage.addEventListener('error', () => {
    revealImage.hidden = true;
  });
}

guessInput.addEventListener('input', () => {
  delete guessInput.dataset.cardId;
  updateSuggestions();
});

guessInput.addEventListener('focus', updateSuggestions);

document.addEventListener('click', (event) => {
  if (!guessForm.contains(event.target)) {
    hideSuggestions();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideSuggestions();
  }
});

guessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = guessInput.value.trim();
  if (!value) {
    setFeedback("Saisis le nom d'une carte.");
    return;
  }

  const selectedId = guessInput.dataset.cardId;
  const resolution = resolveGuess(value, selectedId);
  delete guessInput.dataset.cardId;

  if (resolution.error) {
    setFeedback(resolution.error, resolution.detail ?? '');
    return;
  }

  const guessCard = resolution.card;
  if (guessedIds.has(guessCard.id)) {
    setFeedback('Tu as déjà essayé cette carte.');
    guessInput.value = '';
    hideSuggestions();
    return;
  }

  guessedIds.add(guessCard.id);
  const isCorrect = guessCard.id === targetCard.id;
  addHistoryItem(guessCard, isCorrect);
  guessInput.value = '';
  hideSuggestions();

  if (isCorrect) {
    handleVictory(guessCard);
  } else {
    setFeedback(`Non, ce n'est pas ${guessCard.name}.`);
  }
});

function updateSuggestions() {
  if (!suggestionsContainer) {
    return;
  }

  const value = guessInput.value.trim();
  if (value.length < 2) {
    hideSuggestions();
    return;
  }

  const normalizedTerm = normalize(value);
  const matches = cards.filter((card) => {
    if (guessedIds.has(card.id)) {
      return false;
    }
    return normalize(card.name).includes(normalizedTerm);
  });

  renderSuggestions(matches.slice(0, 8));
}

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = '';

  if (suggestions.length === 0) {
    suggestionsContainer.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  suggestions.forEach((card) => {
    fragment.appendChild(createSuggestionItem(card));
  });

  suggestionsContainer.appendChild(fragment);
  suggestionsContainer.hidden = false;
}

function createSuggestionItem(card) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guess-suggestion';
  button.dataset.cardId = card.id;

  const hasImage = Boolean(card.imagePath);
  const visual = hasImage
    ? Object.assign(document.createElement('img'), {
        src: card.imagePath,
        alt: '',
        className: 'guess-suggestion__image',
      })
    : Object.assign(document.createElement('span'), {
        className: 'guess-suggestion__placeholder',
        textContent: card.name.slice(0, 1).toUpperCase(),
      });

  const content = document.createElement('span');
  content.className = 'guess-suggestion__content';

  const name = document.createElement('span');
  name.className = 'guess-suggestion__name';
  name.textContent = card.name;
  content.appendChild(name);

  button.appendChild(visual);
  button.appendChild(content);

  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    selectSuggestion(card);
  });

  return button;
}

function selectSuggestion(card) {
  guessInput.value = card.name;
  guessInput.dataset.cardId = card.id;
  hideSuggestions();
  guessInput.focus();
}

function hideSuggestions() {
  if (!suggestionsContainer) {
    return;
  }

  suggestionsContainer.innerHTML = '';
  suggestionsContainer.hidden = true;
}

function resolveGuess(input, selectedId) {
  if (selectedId && idLookup.has(selectedId)) {
    return { card: idLookup.get(selectedId) };
  }

  const normalized = normalize(input);

  if (cardLookup.has(normalized)) {
    return { card: cardLookup.get(normalized) };
  }

  const matches = nameLookup.get(normalized);
  if (!matches || matches.length === 0) {
    return { error: `Aucune carte trouvée pour "${input}".` };
  }

  if (matches.length > 1) {
    return {
      error: 'Plusieurs cartes portent ce nom.',
      detail: 'Sélectionne la carte correspondante dans la liste des propositions.',
    };
  }

  return { card: matches[0] };
}

function addHistoryItem(card, isCorrect) {
  const item = document.createElement('li');
  item.className = 'guess-history__item';
  if (isCorrect) {
    item.classList.add('guess-history__item--success');
  }

  const name = document.createElement('span');
  name.className = 'guess-history__name';
  name.textContent = card.name;
  item.appendChild(name);

  const status = document.createElement('span');
  status.className = 'guess-history__status';
  status.textContent = isCorrect ? 'Bonne réponse !' : 'Raté';
  item.appendChild(status);

  historyList.prepend(item);
}

function handleVictory(card) {
  setFeedback('Bravo ! Tu as trouvé la carte mystère.');
  revealCard(card);
  guessInput.disabled = true;
  const submitButton = guessForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
}

function revealCard(card) {
  if (!revealSection) {
    return;
  }

  revealName.textContent = card.name;
  revealMeta.textContent = `${seasonLabels[card.season] ?? `Saison ${card.season}`} · ${
    card.collectionName
  } · ${rarityLabels[card.rarity] ?? card.rarity} · ${typeLabels[card.type] ?? card.type}`;
  revealDescription.textContent = card.description;

  if (card.imagePath) {
    revealImage.hidden = false;
    revealImage.src = card.imagePath;
    revealImage.alt = card.name;
  } else {
    revealImage.hidden = true;
  }

  revealSection.hidden = false;
}

function setFeedback(message, detail = '') {
  feedback.textContent = [message, detail].filter(Boolean).join(' ');
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function pickDailyCard(list, salt = '') {
  const date = new Date();
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}-${salt}`;
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  const index = hash % list.length;
  return list[index];
}
