export const TRAIT_DEFINITIONS = Object.freeze({
  assault: {
    name: 'Assaut',
    glyph: 'A',
    color: '#fb7185',
    thresholds: [2, 4],
    descriptions: [
      'Les unités Assaut gagnent +1 attaque.',
      'Les unités Assaut gagnent +3 attaque.',
    ],
  },
  bulwark: {
    name: 'Rempart',
    glyph: 'R',
    color: '#67e8f9',
    thresholds: [2, 4],
    descriptions: [
      'Les unités Rempart gagnent +2 vie.',
      'Les unités Rempart gagnent +5 vie.',
    ],
  },
  arcanist: {
    name: 'Arcaniste',
    glyph: 'M',
    color: '#c084fc',
    thresholds: [2, 4],
    descriptions: [
      'Leurs attaques infligent 1 dégât aux unités voisines.',
      'Leurs attaques infligent 2 dégâts aux unités voisines.',
    ],
  },
  support: {
    name: 'Soutien',
    glyph: 'S',
    color: '#4ade80',
    thresholds: [2, 4],
    descriptions: [
      'Après ton assaut, ton équipe récupère 1 vie.',
      'Après ton assaut, ton équipe récupère 2 vies.',
    ],
  },
  marksman: {
    name: 'Tireur',
    glyph: 'T',
    color: '#fbbf24',
    thresholds: [2, 4],
    descriptions: [
      'L’excès de dégâts des Tireurs frappe le noyau.',
      'Le débordement gagne 2 dégâts supplémentaires.',
    ],
  },
  survivor: {
    name: 'Survivant',
    glyph: 'V',
    color: '#a3e635',
    thresholds: [2, 4],
    descriptions: [
      'Les Survivants récupèrent 1 vie après chaque combat.',
      'Ils reviennent une fois avec 3 vies après leur destruction.',
    ],
  },
  tactician: {
    name: 'Stratège',
    glyph: 'C',
    color: '#f0abfc',
    thresholds: [2, 4],
    descriptions: [
      'Tu gagnes +1 énergie au début de ton tour.',
      'Tu gagnes +2 énergie au début de ton tour.',
    ],
  },
});

const TRAIT_ORDER = Object.keys(TRAIT_DEFINITIONS);

const KEYWORD_RULES = {
  assault: [
    /guerr|combat|attaque|massacre|tuer|tranch|dragon|soldat|démon|chasseur|chef|command|guerre|rage|fort|puissant|boss|dégât/,
  ],
  bulwark: [
    /armure|bouclier|protéger|protection|défens|défend|paladin|tank|mur|résist|forteresse|gardien|bastion/,
  ],
  arcanist: [
    /magie|mage|dieu|pouvoir|arcane|void|néant|sorci|tempête|feu|glace|démon|myst|extra.dimension|transférence|phénomène/,
  ],
  support: [
    /support|soin|heal|aider|accompagn|conseill|diplom|taverni|serveur|sauveur|copine|alliance|protect|général/,
  ],
  marksman: [
    /tir|gun|fusil|canon|sniper|arme|flèche|caitlyn|jinx|jhin|miss fortune|jayce|twitch|samira|chasseur/,
  ],
  survivor: [
    /surviv|mort|apocalypse|regret|traumatis|oublié|résist|dernier|revenir|revient|tortur|accident|destin/,
  ],
  tactician: [
    /chef|command|strat|conseill|roi|reine|diplom|empereur|général|leader|manipul|noble|professeur|détective|polit/,
  ],
};

const KNOWLEDGE_OVERRIDES = [
  [/jinx|draven|darius|aatrox|ambessa|vi$|vander|ulgar|karror|tryndamere|mordekaiser/i, ['assault']],
  [/caitlyn|jhin|miss fortune|jayce|lord duncan|tommy|twitch|samira/i, ['marksman']],
  [/lux|viktor|mel|ahri|brand|zyra|morgana|zilean|lotus|the void|sauveur/i, ['arcanist']],
  [/sona|nami|janna|seraphine|dina|serveur|tavernière|lotus/i, ['support']],
  [/garen|nautilus|rammus|poppy|shen|joel|abby|la taverne|comptoir/i, ['bulwark']],
  [/ellie|joel|abby|tenno|umbra|survivant|vander|jinx fracturé/i, ['survivor']],
  [/silco|mel|ambessa|caitlyn|cléopâtre|trajan|alexandre|saladin|aliénor/i, ['tactician']],
];

export function inferCardTraits(card) {
  const scores = Object.fromEntries(TRAIT_ORDER.map((trait) => [trait, 0]));
  const searchable = normalize(`${card.name} ${card.description}`);

  Object.entries(KEYWORD_RULES).forEach(([trait, patterns]) => {
    patterns.forEach((pattern) => {
      if (pattern.test(searchable)) {
        scores[trait] += 3;
      }
    });
  });

  KNOWLEDGE_OVERRIDES.forEach(([pattern, traits]) => {
    if (pattern.test(searchable)) {
      traits.forEach((trait) => {
        scores[trait] += 6;
      });
    }
  });

  const fallbackOrder = getFallbackOrder(card);
  return TRAIT_ORDER
    .map((trait) => ({ trait, score: scores[trait], fallback: fallbackOrder.indexOf(trait) }))
    .sort((left, right) => right.score - left.score || left.fallback - right.fallback)
    .slice(0, 2)
    .map((entry) => entry.trait);
}

function getFallbackOrder(card) {
  const seed = hash(`${card.id}:${card.name}`);
  return [...TRAIT_ORDER].sort((left, right) => {
    const leftScore = hash(`${seed}:${left}`);
    const rightScore = hash(`${seed}:${right}`);
    return leftScore - rightScore;
  });
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function getTraitTier(count, trait) {
  const thresholds = TRAIT_DEFINITIONS[trait]?.thresholds ?? [2, 4];
  if (count >= thresholds[1]) {
    return 2;
  }
  if (count >= thresholds[0]) {
    return 1;
  }
  return 0;
}

export function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
