import { GameModes, getSummaryState } from './dailySummary.js';

export function setupSummaryAccess({ buttonId = 'summary-button', onRequestShow } = {}) {
  const button = document.getElementById(buttonId);

  if (!button) {
    return {
      refresh: () => {},
      hide: () => {},
    };
  }

  function hideButton() {
    button.hidden = true;
    button.disabled = true;
  }

  function showButton() {
    button.hidden = false;
    button.disabled = false;
  }

  function isSummaryAvailable(summary) {
    if (!summary || typeof summary !== 'object') {
      return false;
    }

    const entries = summary.entries;
    if (!entries || typeof entries !== 'object') {
      return false;
    }

    return Object.values(GameModes).every((mode) => Boolean(entries[mode]));
  }

  button.addEventListener('click', () => {
    const summary = getSummaryState();
    if (!isSummaryAvailable(summary)) {
      hideButton();
      return;
    }

    if (typeof onRequestShow === 'function') {
      onRequestShow(summary);
    }
  });

  function refresh(summary) {
    const state = summary ?? getSummaryState();
    if (isSummaryAvailable(state)) {
      showButton();
    } else {
      hideButton();
    }
  }

  hideButton();

  return {
    refresh,
    hide: hideButton,
  };
}
