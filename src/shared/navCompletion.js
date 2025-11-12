import { getSummaryState } from './dailySummary.js';

const COMPLETED_CLASS = 'layout__nav-link--completed';

function getNavLink(mode) {
  return document.querySelector(`.layout__nav-link[data-mode="${mode}"]`);
}

export function markModeCompleted(mode) {
  const link = getNavLink(mode);
  if (!link) {
    return;
  }

  link.classList.add(COMPLETED_CLASS);
}

export function syncNavCompletion() {
  const summary = getSummaryState();
  const entries = summary?.entries;
  if (!entries || typeof entries !== 'object') {
    return;
  }

  Object.entries(entries).forEach(([mode, entry]) => {
    if (entry) {
      markModeCompleted(mode);
    }
  });
}
