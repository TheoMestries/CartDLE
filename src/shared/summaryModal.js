import { GameModes, markSummaryDisplayed } from './dailySummary.js';

export function setupSummaryModal({
  modalId = 'summary-modal',
  listId = 'summary-list',
  subtitleId = 'summary-subtitle',
  onClose,
} = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return {
      show: () => {},
      close: () => {},
      isOpen: () => false,
    };
  }

  const listElement = listId ? document.getElementById(listId) : null;
  const subtitleElement = subtitleId ? document.getElementById(subtitleId) : null;
  const streakElement = document.getElementById('summary-streak');
  const closeElements = Array.from(modal.querySelectorAll('[data-summary-close]'));
  const closeButton = closeElements.find((element) => element.tagName === 'BUTTON') ?? closeElements[0] ?? null;
  let isClosing = false;
  let transitionHandler = null;

  closeElements.forEach((element) => {
    element.addEventListener('click', () => {
      close();
    });
  });

  function show(summaryState) {
    if (!summaryState || !listElement) {
      return;
    }

    if (transitionHandler) {
      modal.removeEventListener('transitionend', transitionHandler);
      transitionHandler = null;
    }

    isClosing = false;
    renderSummaryList(summaryState);
    updateSubtitle(summaryState);
    updateStreak(summaryState);

    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add('modal--open');
      closeButton?.focus();
    });
  }

  function close() {
    if (modal.hidden || isClosing) {
      return;
    }

    modal.classList.remove('modal--open');
    isClosing = true;

    const finalize = () => {
      modal.hidden = true;
      isClosing = false;
      modal.removeEventListener('transitionend', finalize);
      transitionHandler = null;
      markSummaryDisplayed();
      if (typeof onClose === 'function') {
        onClose();
      }
    };

    transitionHandler = finalize;
    modal.addEventListener('transitionend', finalize);
    setTimeout(() => {
      if (isClosing) {
        finalize();
      }
    }, 320);
  }

  function renderSummaryList(summaryState) {
    listElement.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const modes = Object.values(GameModes);

    modes
      .map((mode) => summaryState.entries?.[mode])
      .filter(Boolean)
      .forEach((entry) => {
        fragment.appendChild(createSummaryItem(entry));
      });

    listElement.appendChild(fragment);
  }

  function createSummaryItem(entry) {
    const item = document.createElement('li');
    item.className = 'summary-list__item';

    const header = document.createElement('div');
    header.className = 'summary-list__header';

    const modeSpan = document.createElement('span');
    modeSpan.className = 'summary-list__mode';
    modeSpan.textContent = entry.modeLabel ?? '';
    header.appendChild(modeSpan);

    const attemptsSpan = document.createElement('span');
    attemptsSpan.className = 'summary-list__attempts';
    attemptsSpan.textContent = formatAttempts(entry.attempts);
    header.appendChild(attemptsSpan);

    item.appendChild(header);

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'summary-list__card';
    cardTitle.textContent = entry.cardName ?? '';
    item.appendChild(cardTitle);

    if (entry.meta) {
      const meta = document.createElement('p');
      meta.className = 'summary-list__meta';
      meta.textContent = entry.meta;
      item.appendChild(meta);
    }

    if (entry.description) {
      const description = document.createElement('p');
      description.className = 'summary-list__description';
      description.textContent = entry.description;
      item.appendChild(description);
    }

    return item;
  }

  function updateSubtitle(summaryState) {
    if (!subtitleElement) {
      return;
    }

    const formattedDate = formatDate(summaryState.date);
    const dateLabel = formattedDate ? ` du ${formattedDate}` : '';
    subtitleElement.textContent = `Tu as complété les 3 modes${dateLabel}.`;
  }

  function updateStreak(summaryState) {
    if (!streakElement) {
      return;
    }

    const streak = summaryState?.streak;
    const current = Number.isFinite(streak?.current) ? Math.max(0, streak.current) : 0;
    const best = Number.isFinite(streak?.best) ? Math.max(0, streak.best) : 0;

    if (current <= 0) {
      streakElement.hidden = true;
      streakElement.textContent = '';
      return;
    }

    const currentLabel = formatDayCount(current);
    const bestLabel = best > 0 ? formatDayCount(best) : '';
    const parts = [`Série actuelle : ${currentLabel}`];
    if (best > 0) {
      parts.push(`Meilleure série : ${bestLabel}`);
    }

    streakElement.textContent = parts.join(' · ');
    streakElement.hidden = false;
  }

  function formatAttempts(attempts) {
    if (!Number.isFinite(attempts) || attempts <= 0) {
      return '—';
    }
    const label = attempts > 1 ? 'tentatives' : 'tentative';
    return `${attempts} ${label}`;
  }

  function formatDayCount(count) {
    const safeCount = Math.max(0, Math.floor(count));
    const label = safeCount > 1 ? 'jours' : 'jour';
    return `${safeCount} ${label}`;
  }

  function formatDate(value) {
    if (!value) {
      return '';
    }

    const parts = value.split('-').map((part) => Number.parseInt(part, 10));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return '';
    }

    const [year, month, day] = parts;
    const date = new Date(Date.UTC(year, month - 1, day));

    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch (error) {
      return '';
    }
  }

  return {
    show,
    close,
    isOpen: () => !modal.hidden,
  };
}
