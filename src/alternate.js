import cards from './data/index.js';
import alternateImages from './data/alternateImages.js';
import { GameModes, recordVictory } from './shared/dailySummary.js';
import { markModeCompleted, syncNavCompletion } from './shared/navCompletion.js';
import { setupSummaryModal } from './shared/summaryModal.js';
import { setupSummaryAccess } from './shared/summaryAccess.js';

const STORAGE_KEY = 'cartdle-alternate-state';
const MAX_ERRORS = 3;

const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const suggestionsContainer = document.getElementById('guess-suggestions');
const feedback = document.getElementById('feedback');
const historyList = document.getElementById('guess-history');
const alternateImage = document.getElementById('alternate-image');
const progressElement = document.getElementById('alternate-progress');
const errorsElement = document.getElementById('alternate-errors');
const victoryModal = document.getElementById('victory-modal');
const victorySubtitle = document.getElementById('victory-subtitle');
const victoryFound = document.getElementById('victory-found');
const victoryErrors = document.getElementById('victory-errors');
const victoryAttempts = document.getElementById('victory-attempts');
const victoryClose = document.getElementById('victory-close');
const modalOverlay = victoryModal?.querySelector('[data-close]');
const galleryLink = document.getElementById('alternate-gallery-link');

const summaryController = setupSummaryModal({
  onClose: () => {
    if (guessInput && !guessInput.disabled && document.activeElement === document.body) {
      guessInput.focus();
    }
  },
});
const summaryAccess = setupSummaryAccess({
  onRequestShow: (summary) => summaryController.show(summary),
});

syncNavCompletion();
summaryAccess.refresh();

const cardLookup = new Map();
const nameLookup = new Map();
const idLookup = new Map();

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

const alternatePool = alternateImages
  .map((entry) => {
    const card = idLookup.get(entry.cardId);
    if (!card) {
      return null;
    }
    return { ...entry, card };
  })
  .filter(Boolean);
const isAlternatePoolEmpty = alternatePool.length === 0;

const entryByCardId = new Map(alternatePool.map((entry) => [entry.cardId, entry]));

let order = createShuffledOrder();
let currentIndex = 0;
let errorCount = 0;
let totalGuesses = 0;
let history = [];
let solved = false;
let lastCorrectEntry = null;
let pendingSummary = null;

initializeState();
renderCurrentEntry();
updateStatus();

if (isAlternatePoolEmpty) {
  informMissingAlternates();
  disableGuessing();
}

if (alternateImage) {
  alternateImage.addEventListener('error', () => {
    alternateImage.hidden = true;
    setFeedback("Impossible d'afficher ce visuel.");
  });
}

if (victoryClose) {
  victoryClose.addEventListener('click', closeVictoryModal);
}
if (modalOverlay) {
  modalOverlay.addEventListener('click', closeVictoryModal);
}

guessInput.addEventListener('input', () => {
  delete guessInput.dataset.cardId;
  updateSuggestions();
});

guessInput.addEventListener('focus', updateSuggestions);

if (guessForm) {
  guessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = guessInput.value.trim();
    if (!value) {
      setFeedback("Saisis le nom d'une carte.");
      return;
    }

    const currentEntry = getCurrentEntry();
    if (!currentEntry) {
      setFeedback('Toutes les images ont déjà été trouvées.');
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
    totalGuesses += 1;
    const isCorrect = guessCard.id === currentEntry.cardId;

    addHistoryItem(currentEntry, guessCard, isCorrect);
    guessInput.value = '';
    hideSuggestions();

    if (isCorrect) {
      lastCorrectEntry = currentEntry;
      currentIndex += 1;
      setFeedback('Bravo ! Passe à l\'image suivante.');

      if (currentIndex >= order.length) {
        handleVictory();
      } else {
        renderCurrentEntry();
      }
    } else {
      errorCount += 1;
      const remaining = MAX_ERRORS - errorCount;
      const errorLabel = remaining > 0
        ? `Non, ce n'est pas ${guessCard.name}. Encore ${remaining} erreur${remaining > 1 ? 's' : ''} possible${remaining > 1 ? 's' : ''}.`
        : `Non, ce n'est pas ${guessCard.name}. Tu as atteint la limite d'erreurs.`;
      setFeedback(errorLabel);

      if (errorCount >= MAX_ERRORS) {
        resetRun({ withMessage: '3 erreurs, la série recommence depuis le début.' });
        return;
      }
    }

    updateStatus();
    persistState();
  });
}

document.addEventListener('click', (event) => {
  if (guessForm && !guessForm.contains(event.target)) {
    hideSuggestions();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (summaryController.isOpen()) {
      summaryController.close();
      return;
    }

    if (victoryModal && !victoryModal.hidden) {
      closeVictoryModal();
      return;
    }

    hideSuggestions();
  }
});

function initializeState() {
  const stored = loadStoredState(STORAGE_KEY);
  if (!stored) {
    return;
  }

  order = normalizeOrder(Array.isArray(stored.order) ? stored.order : createShuffledOrder());
  currentIndex = clampNumber(stored.currentIndex, 0, order.length);
  errorCount = clampNumber(stored.errorCount, 0, MAX_ERRORS);
  totalGuesses = clampNumber(stored.totalGuesses, 0, 9999);
  solved = Boolean(stored.solved);
  history = Array.isArray(stored.history)
    ? stored.history.filter((item) => entryByCardId.has(item.cardId))
    : [];

  history.forEach((item) => {
    const entry = entryByCardId.get(item.cardId);
    const card = idLookup.get(item.guessId) ?? entry?.card;
    if (entry && card) {
      addHistoryItem(entry, card, Boolean(item.correct), { persist: false });
      if (item.correct) {
        lastCorrectEntry = entry;
      }
    }
  });

  if (solved || currentIndex >= order.length) {
    handleVictory({ openModal: false });
  }
}

function renderCurrentEntry() {
  if (isAlternatePoolEmpty) {
    if (alternateImage) {
      alternateImage.hidden = true;
    }
    return;
  }

  const entry = getCurrentEntry();
  if (!entry || !alternateImage) {
    return;
  }

  alternateImage.hidden = false;
  alternateImage.src = entry.imagePath;
  alternateImage.alt = `Visuel alternatif de ${entry.cardName}`;
}

function updateStatus() {
  if (progressElement) {
    const foundCount = Math.min(currentIndex, order.length);
    const status = isAlternatePoolEmpty
      ? 'Aucune image configurée. Ajoute tes visuels dans src/data/alternateImages.js.'
      : `${foundCount} / ${order.length} images`;
    progressElement.textContent = status;
  }
  if (errorsElement) {
    errorsElement.textContent = `Erreurs : ${errorCount} / ${MAX_ERRORS}`;
  }
}

function informMissingAlternates() {
  setFeedback('Aucun visuel alternatif n’est configuré.', 'Ajoute tes cartes dans src/data/alternateImages.js.');
}

function disableGuessing() {
  if (guessInput) {
    guessInput.disabled = true;
  }
  if (guessForm) {
    const submitButton = guessForm.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }
  }
  hideSuggestions();
}

function getCurrentEntry() {
  const targetId = order[currentIndex];
  return entryByCardId.get(targetId);
}

function addHistoryItem(entry, guessedCard, correct, { persist = true } = {}) {
  if (!historyList) {
    return;
  }

  const item = document.createElement('li');
  item.className = 'guess-history__item';
  if (correct) {
    item.classList.add('guess-history__item--success');
  }

  const name = document.createElement('span');
  name.className = 'guess-history__name';
  name.textContent = guessedCard.name;
  item.appendChild(name);

  const status = document.createElement('span');
  status.className = 'guess-history__status';
  status.textContent = correct
    ? `${entry.cardName} (${entry.collectionName})`
    : 'Mauvaise réponse';
  item.appendChild(status);

  historyList.prepend(item);

  if (persist) {
    history.push({ cardId: entry.cardId, guessId: guessedCard.id, correct });
  }
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
  const matches = cards.filter((card) => normalize(card.name).includes(normalizedTerm));

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

function resetRun({ withMessage } = {}) {
  order = createShuffledOrder();
  currentIndex = 0;
  errorCount = 0;
  totalGuesses = 0;
  history = [];
  solved = false;
  lastCorrectEntry = null;

  if (guessInput) {
    guessInput.disabled = false;
  }

  if (historyList) {
    historyList.innerHTML = '';
  }

  if (withMessage) {
    setFeedback(withMessage);
  } else {
    setFeedback('Nouvelle série commencée.');
  }

  renderCurrentEntry();
  updateStatus();
  persistState();
}

function handleVictory({ openModal = true } = {}) {
  solved = true;
  markModeCompleted(GameModes.Alternate);

  const attempts = Math.max(totalGuesses, order.length);
  const errorLabel = `${errorCount} erreur${errorCount > 1 ? 's' : ''}`;
  const result = recordVictory(GameModes.Alternate, {
    cardId: lastCorrectEntry?.cardId ?? order[order.length - 1] ?? '',
    cardName: 'Visuels alternatifs',
    attempts,
    meta: `${order.length} images · ${errorLabel}`,
    description: 'Défi des visuels alternatifs terminé.',
    modeLabel: 'Visuels alternatifs',
  });

  summaryAccess.refresh(result.summary);

  if (result.allComplete && !result.alreadyDisplayed && result.summary) {
    pendingSummary = result.summary;
  }

  if (guessInput) {
    guessInput.disabled = true;
  }
  hideSuggestions();
  updateVictoryModal({ attempts });
  showGalleryLink();
  updateStatus();
  persistState();

  if (openModal) {
    showVictoryModal();
  }
}

function updateVictoryModal({ attempts }) {
  const foundLabel = `${order.length} / ${order.length}`;
  const errorLabel = `${errorCount} / ${MAX_ERRORS}`;

  if (victorySubtitle) {
    victorySubtitle.textContent = errorCount >= MAX_ERRORS
      ? 'Série terminée juste avant la limite !'
      : 'Série complétée avec moins de 3 erreurs.';
  }
  if (victoryFound) {
    victoryFound.textContent = foundLabel;
  }
  if (victoryErrors) {
    victoryErrors.textContent = errorLabel;
  }
  if (victoryAttempts) {
    victoryAttempts.textContent = String(attempts);
  }
}

function showGalleryLink() {
  if (!galleryLink) {
    return;
  }

  galleryLink.hidden = false;
}

function showVictoryModal() {
  if (!victoryModal) {
    return;
  }

  victoryModal.hidden = false;
  requestAnimationFrame(() => {
    victoryModal.classList.add('modal--open');
    victoryClose?.focus();
  });
}

function closeVictoryModal() {
  if (!victoryModal || victoryModal.hidden) {
    return;
  }

  victoryModal.classList.remove('modal--open');
  const finalize = () => {
    victoryModal.hidden = true;
    victoryModal.removeEventListener('transitionend', finalize);
    if (pendingSummary) {
      summaryController.show(pendingSummary);
      pendingSummary = null;
    }
  };

  victoryModal.addEventListener('transitionend', finalize);
  setTimeout(() => finalize(), 320);
}

function setFeedback(message, detail = '') {
  if (!feedback) {
    return;
  }

  feedback.innerHTML = '';
  if (!message) {
    feedback.textContent = '';
    return;
  }

  const mainText = document.createElement('span');
  mainText.textContent = message;
  feedback.appendChild(mainText);

  if (detail) {
    const detailText = document.createElement('span');
    detailText.className = 'feedback__detail';
    detailText.textContent = detail;
    feedback.appendChild(detailText);
  }
}

function persistState() {
  const state = {
    order,
    currentIndex,
    errorCount,
    totalGuesses,
    solved,
    history,
  };
  saveStoredState(STORAGE_KEY, state);
}

function normalizeOrder(orderList) {
  const valid = Array.isArray(orderList)
    ? orderList.filter((id) => entryByCardId.has(id))
    : [];
  const missing = alternatePool
    .map((entry) => entry.cardId)
    .filter((id) => !valid.includes(id));
  return [...valid, ...shuffle(missing)];
}

function createShuffledOrder() {
  const ids = alternatePool.map((entry) => entry.cardId);
  return shuffle(ids);
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .trim();
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.floor(value), min), max);
}

function saveStoredState(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Impossible de sauvegarder le statut du mode alternatif.', error);
  }
}

function loadStoredState(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de charger le statut du mode alternatif.', error);
    return null;
  }
}
