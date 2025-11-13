const SUMMARY_STORAGE_KEY = 'cartdle-daily-summary';
const STREAK_STORAGE_KEY = 'cartdle-completion-streak';

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
  const wasComplete = areAllModesComplete(state.entries);

  state.entries[mode] = {
    cardId: entry?.cardId ?? null,
    cardName: entry?.cardName ?? '',
    attempts: Number.isFinite(entry?.attempts) ? entry.attempts : null,
    meta: entry?.meta ?? '',
    description: entry?.description ?? '',
    modeLabel: entry?.modeLabel ?? defaultModeLabels[mode] ?? mode,
  };

  saveSummary(state);

  const allComplete = areAllModesComplete(state.entries);

  if (allComplete && !wasComplete) {
    state.completedAt = new Date().toISOString();
    state.streak = updateStreak(today);
    saveSummary(state);
  }

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

function areAllModesComplete(entries) {
  return Object.values(GameModes).every((value) => Boolean(entries?.[value]));
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
      completedAt: null,
      streak: normalizeSummaryStreak(null),
    };
  }

  return {
    date: stored.date,
    entries: typeof stored.entries === 'object' && stored.entries !== null ? stored.entries : {},
    displayed: Boolean(stored.displayed),
    completedAt: typeof stored.completedAt === 'string' ? stored.completedAt : null,
    streak: normalizeSummaryStreak(stored.streak),
  };
}

function updateStreak(today) {
  const stored = loadStreakState();
  const streakState = normalizeStreakState(stored);
  const lastDate = streakState.lastCompletedDate;
  const lastCompletion = parseDateIdentifier(lastDate);
  const currentDate = parseDateIdentifier(today);

  let currentStreak = 1;
  if (lastCompletion && currentDate) {
    const diff = calculateDayDifference(lastCompletion, currentDate);
    if (diff === 0) {
      currentStreak = streakState.currentStreak || 1;
    } else if (diff === 1) {
      currentStreak = streakState.currentStreak + 1;
    }
  }

  if (!Number.isFinite(currentStreak) || currentStreak <= 0) {
    currentStreak = 1;
  }

  const bestStreak = Math.max(streakState.bestStreak, currentStreak);
  const updated = {
    currentStreak,
    bestStreak,
    lastCompletedDate: today,
  };

  saveStreakState(updated);

  return {
    current: currentStreak,
    best: bestStreak,
  };
}

function loadStreakState() {
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de charger la série de victoires CartDLE.', error);
    return null;
  }
}

function saveStreakState(state) {
  try {
    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Impossible de sauvegarder la série de victoires CartDLE.', error);
  }
}

function normalizeStreakState(value) {
  if (!value || typeof value !== 'object') {
    return { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  }

  const current = Number.isFinite(value.currentStreak) ? Math.max(0, Math.floor(value.currentStreak)) : 0;
  const best = Number.isFinite(value.bestStreak) ? Math.max(0, Math.floor(value.bestStreak)) : 0;
  const lastDate = typeof value.lastCompletedDate === 'string' ? value.lastCompletedDate : null;

  return {
    currentStreak: current,
    bestStreak: Math.max(best, current),
    lastCompletedDate: lastDate,
  };
}

function normalizeSummaryStreak(value) {
  if (!value || typeof value !== 'object') {
    return { current: 0, best: 0 };
  }

  const current = Number.isFinite(value.current) ? Math.max(0, Math.floor(value.current)) : 0;
  const best = Number.isFinite(value.best) ? Math.max(0, Math.floor(value.best)) : 0;

  return {
    current,
    best: Math.max(best, current),
  };
}

function parseDateIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const parts = identifier.split('-').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

function calculateDayDifference(previousDate, currentDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((currentDate.getTime() - previousDate.getTime()) / millisecondsPerDay);
  return diff;
}
