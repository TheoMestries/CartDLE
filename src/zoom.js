import cards from './data/index.js';
import {
  rarityLabels,
  seasonLabels,
  typeLabels,
} from './config/constants.js';
import { GameModes, recordVictory } from './shared/dailySummary.js';
import { setupSummaryModal } from './shared/summaryModal.js';

const STORAGE_KEY = 'cartdle-zoom-state';

const FALLBACK_DESCRIPTION = 'Description indisponible pour cette carte.';
const MAX_ZOOM = 4.5;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.25;

const zoomImage = document.getElementById('zoomed-image');
const zoomPanel = document.querySelector('.zoom-panel');
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
const zoomHint = document.querySelector('.zoom-viewer__hint');
const defaultHintText = zoomHint?.textContent ?? '';
const victoryModal = document.getElementById('victory-modal');
const victoryClose = document.getElementById('victory-close');
const victorySubtitle = victoryModal?.querySelector('.modal__subtitle');
const modalOverlay = victoryModal?.querySelector('[data-close]');
const modalRevealImage = document.getElementById('modal-reveal-image');
const modalRevealName = document.getElementById('modal-reveal-name');
const modalRevealMeta = document.getElementById('modal-reveal-meta');
const modalRevealDescription = document.getElementById('modal-reveal-description');
const summaryController = setupSummaryModal({
  onClose: () => {
    if (guessInput && !guessInput.disabled && document.activeElement === document.body) {
      guessInput.focus();
    }
  },
});

const cardLookup = new Map();
const nameLookup = new Map();
const idLookup = new Map();
const guessedIds = new Set();
const guessHistory = [];
let pendingSummary = null;

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

const imageCards = cards.filter((card) => Boolean(card.imagePath));
const targetPool = imageCards.length > 0 ? imageCards : cards;
const targetCard = pickDailyCard(targetPool, 'zoom');

let zoomLevel = MAX_ZOOM;
updateZoom();
setZoomImage(targetCard);

initializeState();

if (zoomImage) {
  zoomImage.addEventListener('error', () => {
    zoomImage.hidden = true;
    setFeedback("Impossible d'afficher l'image de cette carte.");
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
    const isCorrect = guessCard.id === targetCard.id;
    addHistoryItem(guessCard, isCorrect);
    guessInput.value = '';
    hideSuggestions();

    if (isCorrect) {
      handleVictory(guessCard);
    } else {
      setFeedback(`Non, ce n'est pas ${guessCard.name}.`);
      reduceZoom();
    }

    persistState();
  });
}

function initializeState() {
  const state = loadStoredState(STORAGE_KEY);
  if (!state) {
    return;
  }

  if (state.targetId !== targetCard.id) {
    clearStoredState(STORAGE_KEY);
    return;
  }

  if (typeof state.zoomLevel === 'number' && Number.isFinite(state.zoomLevel)) {
    zoomLevel = clampZoom(state.zoomLevel);
    updateZoom();
  }

  const storedGuesses = Array.isArray(state.guesses) ? state.guesses : [];
  storedGuesses.forEach((id) => {
    if (!idLookup.has(id)) {
      return;
    }
    const card = idLookup.get(id);
    guessedIds.add(card.id);
    guessHistory.push(card.id);
    addHistoryItem(card, card.id === targetCard.id);
  });

  const solved = Boolean(state.solved) || guessHistory.includes(targetCard.id);
  if (solved) {
    handleVictory(targetCard, { openModal: false });
  }
}

function persistState() {
  const state = {
    targetId: targetCard.id,
    guesses: Array.from(guessHistory),
    solved: guessHistory.includes(targetCard.id),
    zoomLevel,
  };
  saveStoredState(STORAGE_KEY, state);
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

  const content = document.createElement('span');
  content.className = 'guess-suggestion__content';

  const name = document.createElement('span');
  name.className = 'guess-suggestion__name';
  name.textContent = card.name;
  content.appendChild(name);

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

function handleVictory(card, { openModal = true } = {}) {
  const attempts = guessHistory.length;
  const victoryText = getVictoryMessage(attempts);
  setVictoryModalSubtitle(victoryText);
  setFeedback(victoryText);
  revealCard(card);
  if (openModal) {
    openVictoryModal(card);
  } else {
    setVictoryModalContent(card);
  }
  guessInput.disabled = true;
  const submitButton = guessForm.querySelector('[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  zoomLevel = clampZoom(1);
  updateZoom();

  const { summary, allComplete, alreadyDisplayed } = recordVictory(GameModes.Zoom, {
    cardId: card.id,
    cardName: card.name,
    attempts,
    meta: getCardMeta(card),
    description: getCardDescription(card),
  });

  if (allComplete && !alreadyDisplayed && summary) {
    if (openModal) {
      pendingSummary = summary;
    } else {
      summaryController.show(summary);
    }
  }
}

function revealCard(card) {
  if (!revealSection) {
    return;
  }

  revealName.textContent = card.name;
  revealMeta.textContent = getCardMeta(card);
  revealDescription.textContent = getCardDescription(card);

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

function getCardMeta(card) {
  return `${seasonLabels[card.season] ?? `Saison ${card.season}`} · ${card.collectionName} · ${
    rarityLabels[card.rarity] ?? card.rarity
  } · ${typeLabels[card.type] ?? card.type}`;
}

function getCardDescription(card) {
  const description = card.description?.trim();
  if (description) {
    return description;
  }

  return FALLBACK_DESCRIPTION;
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
    console.warn("Impossible de charger la progression du zoom mystère.", error);
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
    console.warn("Impossible de sauvegarder la progression du zoom mystère.", error);
  }
}

function clearStoredState(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Impossible de réinitialiser la progression du zoom mystère.", error);
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

function openVictoryModal(card) {
  if (!victoryModal) {
    return;
  }

  setVictoryModalContent(card);
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

  const handleClose = () => {
    victoryModal.hidden = true;
    victoryModal.removeEventListener('transitionend', handleClose);
    if (guessInput && !guessInput.disabled) {
      guessInput.focus();
    }
    if (pendingSummary) {
      summaryController.show(pendingSummary);
      pendingSummary = null;
    }
  };

  victoryModal.addEventListener('transitionend', handleClose);

  setTimeout(() => {
    if (!victoryModal.hidden) {
      handleClose();
    }
  }, 320);
}

function setVictoryModalContent(card) {
  if (!modalRevealName || !modalRevealMeta || !modalRevealDescription) {
    return;
  }

  modalRevealName.textContent = card.name;
  modalRevealMeta.textContent = getCardMeta(card);
  modalRevealDescription.textContent = getCardDescription(card);

  if (modalRevealImage && card.imagePath) {
    modalRevealImage.hidden = false;
    modalRevealImage.src = card.imagePath;
    modalRevealImage.alt = card.name;
  } else if (modalRevealImage) {
    modalRevealImage.hidden = true;
    modalRevealImage.removeAttribute('src');
    modalRevealImage.alt = '';
  }
}

function setZoomImage(card) {
  if (!zoomImage) {
    return;
  }

  if (card.imagePath) {
    zoomImage.hidden = false;
    zoomImage.src = card.imagePath;
    zoomImage.alt = '';
    zoomPanel?.classList.remove('zoom-panel--empty');
    if (zoomHint) {
      zoomHint.textContent = defaultHintText;
    }
  } else {
    zoomImage.hidden = true;
    zoomPanel?.classList.add('zoom-panel--empty');
    if (zoomHint) {
      zoomHint.textContent = "L'image de cette carte n'est pas disponible aujourd'hui.";
    }
    setFeedback("L'image de cette carte n'est pas disponible aujourd'hui.");
  }
}

function updateZoom() {
  if (!zoomImage) {
    return;
  }

  zoomImage.style.transform = `scale(${zoomLevel.toFixed(2)})`;
}

function reduceZoom() {
  zoomLevel = clampZoom(zoomLevel - ZOOM_STEP);
  updateZoom();
}

function clampZoom(value) {
  const limited = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
  return Number.isFinite(limited) ? parseFloat(limited.toFixed(2)) : MIN_ZOOM;
}
