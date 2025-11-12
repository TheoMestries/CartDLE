const SUMMARY_STORAGE_KEY = 'cartdle-daily-summary';

export const GameModes = Object.freeze({
  Classic: 'classic',
  Description: 'description',
  Zoom: 'zoom',
});

const defaultModeLabels = {
  [GameModes.Classic]: 'Indices classiques',
  [GameModes.Description]: 'Description mystère',
  [GameModes.Zoom]: 'Zoom mystère',
};

export function recordVictory(mode, entry) {
  if (!isStorageAvailable()) {
    return { summary: null, allComplete: false, alreadyDisplayed: true };
  }

  const today = getTodayIdentifier();
  const stored = loadStoredSummary();
  const state = normalizeState(stored, today);

  state.entries[mode] = {
    cardId: entry?.cardId ?? null,
    cardName: entry?.cardName ?? '',
    attempts: Number.isFinite(entry?.attempts) ? entry.attempts : null,
    meta: entry?.meta ?? '',
    description: entry?.description ?? '',
    modeLabel: entry?.modeLabel ?? defaultModeLabels[mode] ?? mode,
  };

  saveSummary(state);

  const allComplete = Object.values(GameModes).every((value) => Boolean(state.entries[value]));

  return {
    summary: state,
    allComplete,
    alreadyDisplayed: Boolean(state.displayed),
  };
}

export function markSummaryDisplayed() {
  if (!isStorageAvailable()) {
    return;
  }

  const today = getTodayIdentifier();
  const stored = loadStoredSummary();
  const state = normalizeState(stored, today);
  if (state.displayed) {
    return;
  }

  state.displayed = true;
  saveSummary(state);
}

export function getSummaryState() {
  if (!isStorageAvailable()) {
    return null;
  }

  const today = getTodayIdentifier();
  const stored = loadStoredSummary();
  if (!stored || stored.date !== today) {
    return null;
  }

  return normalizeState(stored, today);
}

function getTodayIdentifier() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

function isStorageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function loadStoredSummary() {
  try {
    const raw = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de charger le résumé quotidien CartDLE.', error);
    return null;
  }
}

function saveSummary(state) {
  try {
    window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Impossible de sauvegarder le résumé quotidien CartDLE.', error);
  }
}

function normalizeState(stored, today) {
  if (!stored || stored.date !== today) {
    return {
      date: today,
      entries: {},
      displayed: false,
    };
  }

  return {
    date: stored.date,
    entries: typeof stored.entries === 'object' && stored.entries !== null ? stored.entries : {},
    displayed: Boolean(stored.displayed),
  };
}
