import cards from './data/index.js';
import alternateImages from './data/alternateImages.js';

const galleryList = document.getElementById('special-noel-gallery');
const emptyMessage = document.getElementById('special-noel-gallery-empty');
const galleryCount = document.getElementById('gallery-count');

const idLookup = new Map(cards.map((card) => [card.id, card]));

const entries = alternateImages
  .map((entry) => {
    const card = idLookup.get(entry.cardId);
    if (!card) {
      return null;
    }
    return { ...entry, card };
  })
  .filter(Boolean);

if (galleryCount) {
  galleryCount.textContent = entries.length
    ? `${entries.length} visuels disponibles`
    : 'Aucun visuel pour le moment.';
}

if (!galleryList || !emptyMessage) {
  throw new Error('Les éléments de la galerie sont introuvables.');
}

if (entries.length === 0) {
  emptyMessage.textContent = 'Aucun visuel alternatif n’est configuré pour le moment.';
  emptyMessage.hidden = false;
  galleryList.hidden = true;
} else {
  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    fragment.appendChild(createGalleryItem(entry, index + 1));
  });
  galleryList.appendChild(fragment);
  galleryList.hidden = false;
}

function createGalleryItem(entry, position) {
  const item = document.createElement('li');
  item.className = 'special-noel-gallery__item';

  const image = document.createElement('img');
  image.className = 'special-noel-gallery__image';
  image.src = entry.imagePath;
  image.alt = `Visuel alternatif ${position} : ${entry.cardName}`;
  image.loading = 'lazy';

  item.appendChild(image);

  return item;
}
