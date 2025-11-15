import cards from './data/index.js';
import {
  rarityOrder,
  rarityLabels,
  typeLabels,
  seasonLabels,
} from './config/constants.js';
import { GameModes, recordVictory } from './shared/dailySummary.js';
import { markModeCompleted, syncNavCompletion } from './shared/navCompletion.js';
import { setupSummaryModal } from './shared/summaryModal.js';
import { setupSummaryAccess } from './shared/summaryAccess.js';

const STORAGE_KEY = 'cartdle-classic-state';

const cardLookup = new Map();
const nameLookup = new Map();
const guessedIds = new Set();
const guessHistory = [];

const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const feedback = document.getElementById('feedback');
const resultsBody = document.querySelector('#results tbody');
const victoryModal = document.getElementById('victory-modal');
const victoryClose = document.getElementById('victory-close');
const victorySubtitle = victoryModal.querySelector('.modal__subtitle');
const modalOverlay = victoryModal.querySelector('[data-close]');
const revealImage = document.getElementById('reveal-image');
const revealName = document.getElementById('reveal-name');
const revealMeta = document.getElementById('reveal-meta');
const revealDescription = document.getElementById('reveal-description');
const suggestionsContainer = document.getElementById('guess-suggestions');
const hintButton = document.getElementById('hint-button');
const hintContent = document.getElementById('hint-content');
const reviewButton = document.getElementById('review-button');
const summaryController = setupSummaryModal({
  onClose: () => {
    if (document.activeElement === document.body && !guessInput.disabled) {
      guessInput.focus();
    }
  },
});
const summaryAccess = setupSummaryAccess({
  onRequestShow: (summary) => {
    summaryController.show(summary);
  },
});

syncNavCompletion();
summaryAccess.refresh();

const rarityIndex = new Map(rarityOrder.map((value, index) => [value, index]));
const idLookup = new Map();
const resultLabels = {
  season: 'Saison',
  collection: 'Collection',
  type: 'Type',
  rarity: 'Rareté',
  collectionSize: 'Taille de la collection',
};

const hintStages = [
  {
    threshold: 4,
    getText: (card, index) =>
      `Indice ${index} — Saison : ${seasonLabels[card.season] ?? `Saison ${card.season}`}.`,
  },
  {
    threshold: 7,
    getText: (card, index) =>
      `Indice ${index} — Collection : « ${card.collectionName} ».`,
  },
  {
    threshold: 11,
    getText: (card, index) => `Indice ${index} — ${card.description}`,
  },
];

let revealedHintCount = 0;
let pendingSummary = null;

cards.forEach((card) => {
  const uniqueLabel = `${card.name} (${card.collectionName})`;
  const key = normalize(uniqueLabel);
  cardLookup.set(key, card);
  idLookup.set(card.id, card);

  const nameKey = normalize(card.name);
  if (!nameLookup.has(nameKey)) {
    nameLookup.set(nameKey, []);
  }
  nameLookup.get(nameKey).push(card);
});

const targetCard = pickDailyCard(cards);

initializeState();

guessInput.addEventListener('input', handleGuessInput);
guessInput.addEventListener('focus', handleGuessFocus);

document.addEventListener('click', (event) => {
  if (!guessForm.contains(event.target)) {
    hideSuggestions();
  }
});

guessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = guessInput.value.trim();
  if (!value) {
    setFeedback('Saisis le nom d\'une carte.');
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
  guessHistory.push(guessCard.id);
  addGuessRow(guessCard, targetCard);
  guessInput.value = '';
  setFeedback('');
  hideSuggestions();
  updateSuggestions();
  updateHintAvailability();

  if (guessCard.id === targetCard.id) {
    handleVictory({ openModal: true });
  }

  persistState();
});

if (hintButton) {
  hintButton.addEventListener('click', revealHint);
}

if (reviewButton) {
  reviewButton.addEventListener('click', () => {
    revealCard(targetCard, { showModal: true });
  });
}

function handleGuessInput() {
  delete guessInput.dataset.cardId;
  updateSuggestions();
}

function handleGuessFocus() {
  updateSuggestions();
}

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

victoryClose.addEventListener('click', closeVictoryModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', closeVictoryModal);
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (summaryController.isOpen()) {
      summaryController.close();
      return;
    }

    if (!victoryModal.hidden) {
      closeVictoryModal();
      return;
    }
    hideSuggestions();
  }
});

revealImage.addEventListener('error', () => {
  revealImage.hidden = true;
});

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
    return { error: `Aucune carte trouvée pour \"${input}\".` };
  }

  if (matches.length > 1) {
    return {
      error: 'Plusieurs cartes portent ce nom.',
      detail: 'Sélectionne la carte correspondante dans la liste des propositions.',
    };
  }

  return { card: matches[0] };
}

function addGuessRow(guessCard, target) {
  const evaluation = evaluateGuess(guessCard, target);
  const row = document.createElement('tr');

  row.appendChild(createVisualCell(guessCard));

  const nameCell = document.createElement('th');
  nameCell.scope = 'row';
  nameCell.textContent = guessCard.name;
  nameCell.dataset.label = 'Carte';
  row.appendChild(nameCell);

  row.appendChild(createResultCell(evaluation.season, 'season'));
  row.appendChild(createResultCell(evaluation.collection, 'collection'));
  row.appendChild(createResultCell(evaluation.type, 'type'));
  row.appendChild(createResultCell(evaluation.rarity, 'rarity'));
  row.appendChild(createResultCell(evaluation.collectionSize, 'collectionSize'));

  resultsBody.prepend(row);
}

function createVisualCell(card) {
  const cell = document.createElement('td');
  cell.className = 'results-table__visual';
  cell.dataset.label = 'Visuel';

  if (card.imagePath) {
    const image = document.createElement('img');
    image.src = card.imagePath;
    image.alt = '';
    image.loading = 'lazy';
    image.className = 'results-table__thumbnail';
    cell.appendChild(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'results-table__thumbnail results-table__thumbnail--placeholder';
    placeholder.textContent = card.name.slice(0, 1).toUpperCase();
    cell.appendChild(placeholder);
  }

  return cell;
}

function createResultCell(result, category) {
  const cell = document.createElement('td');
  cell.dataset.label = resultLabels[category] ?? '';
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
  const seasonStatus = guess.season === target.season ? 'correct' : 'incorrect';
  const guessCollectionLabel = guess.collectionName;
  const targetType = typeLabels[target.type] ?? target.type;
  const guessType = typeLabels[guess.type] ?? guess.type;
  const guessRarityIndex = rarityIndex.get(guess.rarity);
  const targetRarityIndex = rarityIndex.get(target.rarity);
  const rarityStatus =
    guessRarityIndex === targetRarityIndex ? 'correct' : 'incorrect';
  const sizeStatus = compareNumbers(guess.collectionSize, target.collectionSize);

  return {
    season: {
      value: seasonLabels[guess.season] ?? `Saison ${guess.season}`,
      status: seasonStatus,
    },
    collection: {
      value: guessCollectionLabel,
      status: guess.collectionId === target.collectionId ? 'correct' : 'incorrect',
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
      incorrect: 'Ce n\'est pas la bonne saison.',
    },
    collection: {
      incorrect: 'Ce n\'est pas la bonne collection.',
    },
    type: {
      incorrect: 'Le type ne correspond pas (personnage ou lieu).',
    },
    rarity: {
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

function revealCard(card, { showModal = true } = {}) {
  revealName.textContent = card.name;
  revealMeta.textContent = `${seasonLabels[card.season] ?? `Saison ${card.season}`} · ${card.collectionName} · ${
    rarityLabels[card.rarity] ?? card.rarity
  }`;
  revealDescription.textContent = card.description;

  if (hintContent && revealedHintCount > 0) {
    renderHintContent();
  }

  if (card.imagePath) {
    revealImage.src = card.imagePath;
    revealImage.alt = card.name;
    revealImage.hidden = false;
  } else {
    revealImage.hidden = true;
  }

  if (showModal) {
    openVictoryModal();
  }
}

function setFeedback(message, detail = '') {
  feedback.textContent = [message, detail].filter(Boolean).join(' ');
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function openVictoryModal() {
  victoryModal.hidden = false;
  requestAnimationFrame(() => {
    victoryModal.classList.add('modal--open');
    victoryClose.focus();
  });
}

function closeVictoryModal() {
  if (victoryModal.hidden) {
    return;
  }

  victoryModal.classList.remove('modal--open');

  const handleClose = () => {
    victoryModal.hidden = true;
    victoryModal.removeEventListener('transitionend', handleClose);
    guessInput.focus();
    if (pendingSummary) {
      summaryController.show(pendingSummary);
      pendingSummary = null;
    }
  };

  victoryModal.addEventListener('transitionend', handleClose);

  // Fallback in case the transition does not fire
  setTimeout(() => {
    if (!victoryModal.hidden) {
      handleClose();
    }
  }, 320);
}

function updateHintAvailability() {
  if (!hintButton) {
    return;
  }

  if (revealedHintCount >= hintStages.length) {
    hintButton.hidden = true;
    hintButton.disabled = true;
    return;
  }

  const attempts = guessedIds.size;
  const nextStage = hintStages[revealedHintCount];
  if (attempts >= nextStage.threshold) {
    hintButton.hidden = false;
    hintButton.disabled = false;
    hintButton.textContent = `Révéler l'indice ${revealedHintCount + 1}`;
  } else {
    hintButton.hidden = true;
    hintButton.disabled = true;
  }
}

function revealHint() {
  if (!hintButton || !hintContent) {
    return;
  }

  if (revealedHintCount >= hintStages.length) {
    return;
  }

  const nextStage = hintStages[revealedHintCount];
  if (guessedIds.size < nextStage.threshold) {
    return;
  }

  revealedHintCount += 1;
  hintButton.disabled = true;
  hintButton.hidden = true;
  renderHintContent();
  persistState();
  updateHintAvailability();
}

function disableHint() {
  if (!hintButton) {
    return;
  }

  hintButton.disabled = true;
  hintButton.hidden = true;
}

function handleVictory({ openModal = true } = {}) {
  const attempts = guessHistory.length;
  const victoryText = getVictoryMessage(attempts);
  setVictoryModalSubtitle(victoryText);
  revealCard(targetCard, { showModal: openModal });
  setFeedback(victoryText);
  disableHint();
  showReviewButton();

  markModeCompleted(GameModes.Classic);

  const { summary, allComplete, alreadyDisplayed } = recordVictory(GameModes.Classic, {
    cardId: targetCard.id,
    cardName: targetCard.name,
    attempts,
    meta: getCardMeta(targetCard),
    description: targetCard.description,
  });

  summaryAccess.refresh(summary ?? undefined);

  if (allComplete && !alreadyDisplayed && summary) {
    if (openModal) {
      pendingSummary = summary;
    } else {
      summaryController.show(summary);
    }
  }
}

function initializeState() {
  const state = loadStoredState(STORAGE_KEY);
  if (!state) {
    updateHintAvailability();
    return;
  }

  if (state.targetId !== targetCard.id) {
    clearStoredState(STORAGE_KEY);
    updateHintAvailability();
    return;
  }

  const storedGuesses = Array.isArray(state.guesses) ? state.guesses : [];
  storedGuesses.forEach((id) => {
    if (!idLookup.has(id)) {
      return;
    }
    const card = idLookup.get(id);
    guessedIds.add(card.id);
    guessHistory.push(card.id);
    addGuessRow(card, targetCard);
  });

  const storedStage = Number.isInteger(state.hintStage)
    ? Math.max(0, Math.min(state.hintStage, hintStages.length))
    : 0;
  revealedHintCount = storedStage;

  if (revealedHintCount === 0 && state.hintRevealed) {
    revealedHintCount = hintStages.length;
  }

  renderHintContent();

  updateHintAvailability();

  if (guessHistory.includes(targetCard.id)) {
    handleVictory({ openModal: false });
  }
}

function renderHintContent() {
  if (!hintContent) {
    return;
  }

  hintContent.innerHTML = '';

  if (revealedHintCount === 0) {
    hintContent.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  hintStages.slice(0, revealedHintCount).forEach((stage, index) => {
    const entry = document.createElement('p');
    entry.className = 'hint__entry';
    entry.textContent = stage.getText(targetCard, index + 1);
    fragment.appendChild(entry);
  });

  hintContent.appendChild(fragment);
  hintContent.hidden = false;
}

function persistState() {
  const state = {
    targetId: targetCard.id,
    guesses: Array.from(guessHistory),
    hintStage: revealedHintCount,
    hintRevealed: revealedHintCount > 0,
  };
  saveStoredState(STORAGE_KEY, state);
}

function loadStoredState(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de charger la progression CartDLE.', error);
    return null;
  }
}

function saveStoredState(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Impossible de sauvegarder la progression CartDLE.', error);
  }
}

function clearStoredState(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn('Impossible de réinitialiser la progression CartDLE.', error);
  }
}

function getVictoryMessage(attempts) {
  const attemptLabel = attempts > 1 ? 'coups' : 'coup';
  return `Bravo ! Tu as trouvé la carte mystère en ${attempts} ${attemptLabel}.`;
}

function setVictoryModalSubtitle(message) {
  if (!victorySubtitle) {
    return;
  }

  victorySubtitle.textContent = message;
}

function showReviewButton() {
  if (!reviewButton) {
    return;
  }

  reviewButton.hidden = false;
}

function getCardMeta(card) {
  return `${seasonLabels[card.season] ?? `Saison ${card.season}`} · ${card.collectionName} · ${
    rarityLabels[card.rarity] ?? card.rarity
  } · ${typeLabels[card.type] ?? card.type}`;
}
