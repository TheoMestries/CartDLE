export function pickBalancedDailyCard(cards, salt = '', date = new Date()) {
  if (!cards.length) {
    return null;
  }

  const cardsBySeason = groupBy(cards, (card) => card.season);
  const seasons = Array.from(cardsBySeason.keys()).sort((left, right) => left - right);
  const today = date;
  const epochDay = Math.floor(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ) / 86400000);
  const seasonIndex = positiveModulo(epochDay + hashStringToSeed(salt), seasons.length);
  const selectedSeason = seasons[seasonIndex];
  const seasonCards = cardsBySeason.get(selectedSeason);
  const dateKey = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}-${salt}-${selectedSeason}`;
  const cardIndex = hashStringToSeed(dateKey) % seasonCards.length;
  return seasonCards[cardIndex];
}

function groupBy(input, selector) {
  const result = new Map();
  input.forEach((entry) => {
    const key = selector(entry);
    if (!result.has(key)) {
      result.set(key, []);
    }
    result.get(key).push(entry);
  });
  return result;
}

function hashStringToSeed(value) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
