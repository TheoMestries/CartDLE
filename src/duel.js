import cards from './data/index.js';
import { getArenaCostCurve, selectBalancedFeaturedCollections } from './duelDeck.js';
import { getLegendaryEffect } from './duelLegendaries.js';
import { TRAIT_DEFINITIONS, getTraitTier, inferCardTraits } from './duelTraits.js';
import { acceptPeerPacket, createPeerPackets } from './peerTransport.js';

const BOARD_SIZE = 5;
const STARTING_HEALTH = 30;
const STARTING_HAND = 5;
const DECK_SIZE = 20;
const MAX_HAND = 9;
const MAX_ENERGY = 10;
const RECORD_KEY = 'cartdle-arena-wins';
const ONLINE_PEER_PREFIX = 'cartdle-arena-';
const ONLINE_ROOM_PATTERN = /^[A-Z0-9]{6}$/;

const RARITY_STATS = {
  common: { cost: 1, attack: 2, health: 3 },
  rare: { cost: 2, attack: 3, health: 4 },
  epic: { cost: 3, attack: 4, health: 5 },
  legendary: { cost: 4, attack: 6, health: 6 },
  legacy: { cost: 5, attack: 8, health: 8 },
};

const TYPE_STATS = {
  character: { attack: 1, health: -1 },
  classic: { attack: 0, health: 0 },
  location: { attack: -1, health: 2 },
};

const COLLECTION_BONUSES = {
  0: { attack: 0, health: 0 },
  1: { attack: 1, health: 1 },
  2: { attack: 2, health: 3 },
};

const DIFFICULTY_LABELS = {
  rookie: 'Apprenti',
  tactician: 'Tacticien',
  champion: 'Champion',
};

const elements = {
  setupModal: document.querySelector('#setup-modal'),
  handoffModal: document.querySelector('#handoff-modal'),
  resultModal: document.querySelector('#result-modal'),
  rulesModal: document.querySelector('#rules-modal'),
  startButton: document.querySelector('#start-game-button'),
  rematchButton: document.querySelector('#rematch-button'),
  newGameButton: document.querySelector('#new-game-button'),
  rulesButton: document.querySelector('#rules-button'),
  closeRules: document.querySelector('[data-close-rules]'),
  handoffButton: document.querySelector('#handoff-button'),
  handoffMessage: document.querySelector('#handoff-message'),
  difficultyPicker: document.querySelector('#difficulty-picker'),
  difficulty: document.querySelector('#difficulty'),
  onlinePicker: document.querySelector('#online-picker'),
  onlinePlayerName: document.querySelector('#online-player-name'),
  onlineLobby: document.querySelector('#online-lobby'),
  onlineStatus: document.querySelector('#online-status'),
  onlineInviteLink: document.querySelector('#online-invite-link'),
  onlineCopyLink: document.querySelector('#online-copy-link'),
  featuredCollections: document.querySelector('#featured-collections'),
  roundLabel: document.querySelector('#round-label'),
  statusMessage: document.querySelector('#status-message'),
  playerBoard: document.querySelector('#player-board'),
  opponentBoard: document.querySelector('#opponent-board'),
  playerSynergies: document.querySelector('#player-synergies'),
  opponentSynergies: document.querySelector('#opponent-synergies'),
  playerHand: document.querySelector('#player-hand'),
  opponentHand: document.querySelector('#opponent-hand'),
  playerName: document.querySelector('#player-name'),
  opponentName: document.querySelector('#opponent-name'),
  playerAvatar: document.querySelector('#player-avatar'),
  opponentAvatar: document.querySelector('#opponent-avatar'),
  playerHealth: document.querySelector('#player-health'),
  opponentHealth: document.querySelector('#opponent-health'),
  playerEnergy: document.querySelector('#player-energy'),
  opponentEnergy: document.querySelector('#opponent-energy'),
  playerDeck: document.querySelector('#player-deck'),
  opponentDeck: document.querySelector('#opponent-deck'),
  handHint: document.querySelector('#hand-hint'),
  overdriveButton: document.querySelector('#overdrive-button'),
  endTurnButton: document.querySelector('#end-turn-button'),
  logToggle: document.querySelector('#log-toggle'),
  logList: document.querySelector('#battle-log-list'),
  recordWins: document.querySelector('#record-wins'),
  resultKicker: document.querySelector('#result-kicker'),
  resultTitle: document.querySelector('#result-title'),
  resultMessage: document.querySelector('#result-message'),
  resultRounds: document.querySelector('#result-rounds'),
  resultCards: document.querySelector('#result-cards'),
  resultDamage: document.querySelector('#result-damage'),
};

let selectedMode = 'bot';
let state = createEmptyState();
let gameSequence = 0;
const online = {
  roomId: null,
  token: null,
  playerIndex: null,
  version: -1,
  status: null,
  players: null,
  peer: null,
  connection: null,
  authorityState: null,
  incomingPackets: new Map(),
  syncTimer: null,
  roomRequestTimer: null,
  starting: false,
  syncPending: false,
};

initialize();

function initialize() {
  bindEvents();
  renderEmptyArena();
  elements.recordWins.textContent = String(readRecord());
  initializeOnlineInvite();
}

function bindEvents() {
  document.querySelectorAll('[data-mode-choice]').forEach((button) => {
    button.addEventListener('click', () => selectMode(button.dataset.modeChoice));
  });

  elements.startButton.addEventListener('click', startGame);
  elements.rematchButton.addEventListener('click', startGame);
  elements.newGameButton.addEventListener('click', () => {
    gameSequence += 1;
    if (state.mode === 'online') {
      resetOnlineSession();
      selectMode('online');
    }
    elements.setupModal.hidden = false;
  });
  elements.rulesButton.addEventListener('click', () => {
    elements.rulesModal.hidden = false;
  });
  elements.closeRules.addEventListener('click', () => {
    elements.rulesModal.hidden = true;
  });
  elements.rulesModal.addEventListener('click', (event) => {
    if (event.target === elements.rulesModal) {
      elements.rulesModal.hidden = true;
    }
  });
  elements.handoffButton.addEventListener('click', () => {
    elements.handoffModal.hidden = true;
    render();
  });
  elements.overdriveButton.addEventListener('click', useOverdrive);
  elements.endTurnButton.addEventListener('click', () => finishTurn());
  elements.logToggle.addEventListener('click', toggleLog);
  elements.onlineCopyLink.addEventListener('click', copyOnlineInviteLink);
}

function selectMode(mode) {
  const leavingOnline = selectedMode === 'online' && mode !== 'online';
  selectedMode = mode;
  if (leavingOnline) {
    resetOnlineSession();
  }
  document.querySelectorAll('[data-mode-choice]').forEach((button) => {
    const selected = button.dataset.modeChoice === mode;
    button.classList.toggle('mode-card--selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  elements.difficultyPicker.hidden = mode !== 'bot';
  elements.onlinePicker.hidden = mode !== 'online';
  if (mode === 'online') {
    updateOnlineSetupButton();
  } else {
    elements.startButton.textContent = 'Entrer dans l’arène';
    elements.startButton.disabled = false;
  }
}

function createEmptyState() {
  return {
    mode: 'bot',
    difficulty: 'tactician',
    featuredCollections: [],
    players: [],
    activePlayer: 0,
    startingPlayer: 0,
    turn: 1,
    selectedCardId: null,
    gameOver: true,
    botThinking: false,
    log: [],
    stats: {
      cardsPlayed: 0,
      maxDamage: 0,
    },
  };
}

function startGame() {
  if (selectedMode === 'online') {
    void handleOnlineStart();
    return;
  }
  initializeGame(selectedMode);
}

function initializeGame(mode, onlineNames = null) {
  const gameId = ++gameSequence;
  const difficulty = elements.difficulty.value;
  const deckBuild = buildCompositionDeck();
  const botBonus = mode === 'bot' && difficulty === 'champion' ? 3 : 0;
  const startingPlayer = Math.random() < 0.5 ? 0 : 1;
  const playerNames = onlineNames ?? [
    'Joueur 1',
    mode === 'bot' ? DIFFICULTY_LABELS[difficulty] : 'Joueur 2',
  ];

  state = {
    mode,
    difficulty,
    featuredCollections: deckBuild.featuredCollections,
    players: [
      createPlayer(playerNames[0], deckBuild.cards, 0),
      createPlayer(playerNames[1], deckBuild.cards, botBonus),
    ],
    activePlayer: startingPlayer,
    startingPlayer,
    turn: 1,
    selectedCardId: null,
    gameOver: false,
    botThinking: false,
    log: [],
    stats: {
      cardsPlayed: 0,
      maxDamage: 0,
    },
    gameId,
  };

  const secondPlayer = 1 - startingPlayer;
  state.players[secondPlayer].openingEnergyBonus = 1;
  state.players.forEach((player, playerIndex) => {
    const openingHandSize = STARTING_HAND + (playerIndex === secondPlayer ? 1 : 0);
    for (let index = 0; index < openingHandSize; index += 1) {
      drawCard(player, false);
    }
  });

  beginTurn(startingPlayer, false);
  addLog('Le duel commence. Forme une composition avec les collections et les traits de tes cartes.');
  addLog(`${state.players[startingPlayer].name} obtient l’initiative et lancera le premier assaut après les deux déploiements initiaux.`);
  addLog(`${state.players[secondPlayer].name} reçoit une carte supplémentaire et +1 énergie pour préparer sa réplique.`);
  if (botBonus) {
    addLog('Le Champion commence avec un noyau renforcé de 3 points.');
  }

  elements.setupModal.hidden = true;
  elements.resultModal.hidden = true;
  elements.handoffModal.hidden = true;
  render();

  if (mode === 'bot' && startingPlayer === 1) {
    runBotTurn(gameId);
  } else if (mode === 'local') {
    showHandoff(startingPlayer);
  } else if (mode === 'online') {
    void syncOnlineState();
  }
}

function initializeOnlineInvite() {
  const roomId = getInvitationRoom();
  if (!roomId) {
    return;
  }

  selectMode('online');
  updateOnlineSetupButton();
}

async function handleOnlineStart() {
  if (online.roomId && online.token) {
    if (online.playerIndex === 0 && (online.status === 'ready' || online.status === 'finished')) {
      online.starting = true;
      initializeGame('online', online.players);
    }
    return;
  }

  const playerName = elements.onlinePlayerName.value.trim() || 'Joueur';
  elements.startButton.disabled = true;
  elements.onlineLobby.hidden = false;
  elements.onlineStatus.textContent = 'Connexion au salon…';

  try {
    const invitationRoom = getInvitationRoom();
    if (invitationRoom) {
      await joinPeerRoom(invitationRoom, playerName);
    } else {
      await createPeerRoom(playerName);
    }
  } catch (error) {
    elements.onlineStatus.textContent = error.message;
    elements.startButton.disabled = false;
  }
}

async function createPeerRoom(playerName) {
  ensurePeerJsAvailable();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = createRoomCode();
    try {
      const peer = await openPeer(createPeerId(roomId));
      online.peer = peer;
      online.players = [sanitizeOnlineName(playerName, 'Joueur 1'), null];
      online.authorityState = null;
      bindHostPeer(peer);
      connectOnlineSession(roomId, 0);
      online.version = 0;
      processOnlineRoom(createPeerRoomPayload(0), true);
      return;
    } catch (error) {
      if (error.type !== 'unavailable-id') {
        throw error;
      }
    }
  }
  throw new Error('Impossible de réserver un salon. Réessaie.');
}

async function joinPeerRoom(roomId, playerName) {
  ensurePeerJsAvailable();
  const peer = await openPeer();
  const connection = peer.connect(createPeerId(roomId), {
    metadata: { name: sanitizeOnlineName(playerName, 'Joueur 2') },
    reliable: true,
    serialization: 'json',
  });
  try {
    await waitForPeerConnection(connection, peer);
  } catch (error) {
    peer.destroy();
    throw error;
  }
  online.peer = peer;
  online.connection = connection;
  online.players = [null, sanitizeOnlineName(playerName, 'Joueur 2')];
  bindPeerConnection(connection);
  connectOnlineSession(roomId, 1);
  connection.send({ type: 'hello', name: online.players[1] });
  startRoomRequests();
  elements.onlineStatus.textContent = 'Connexion établie. En attente de l’hôte…';
}

function connectOnlineSession(roomId, playerIndex, initialPayload = null) {
  online.roomId = roomId;
  online.token = 'peer';
  online.playerIndex = playerIndex;
  online.version = -1;
  online.status = 'waiting';
  online.starting = false;
  online.incomingPackets.clear();
  setOnlineRoomUrl(roomId);
  elements.onlineLobby.hidden = false;
  elements.onlineInviteLink.value = createOnlineInviteLink(roomId);
  if (initialPayload) {
    processOnlineRoom(initialPayload);
  }
}

function bindHostPeer(peer) {
  peer.on('connection', (connection) => {
    if (online.connection?.open) {
      connection.on('open', () => connection.close());
      return;
    }
    connection.on('open', () => waitForGuestHello(connection));
  });
  peer.on('error', (error) => {
    if (online.peer === peer) {
      elements.onlineStatus.textContent = `Connexion interrompue : ${formatPeerError(error)}`;
    }
  });
}

function waitForGuestHello(connection) {
  const timeout = window.setTimeout(() => {
    connection.off('data', handleHello);
    connection.close();
  }, 5000);
  const handleHello = (message) => {
    if (message?.type !== 'hello') {
      return;
    }
    window.clearTimeout(timeout);
    connection.off('data', handleHello);
    acceptGuestConnection(connection, message.name);
  };
  connection.on('data', handleHello);
}

function acceptGuestConnection(connection, guestName) {
  online.connection = connection;
  online.players[1] = sanitizeOnlineName(guestName ?? connection.metadata?.name, 'Joueur 2');
  if (online.authorityState) {
    online.authorityState.players[1].name = online.players[1];
  }
  online.status = online.authorityState
    ? online.authorityState.gameOver ? 'finished' : 'playing'
    : 'ready';
  bindPeerConnection(connection);
  sendPeerMeta();
  sendPeerRoom();
  processOnlineRoom(createPeerRoomPayload(0), true);
  sendPeerRoomRepeatedly();
}

function bindPeerConnection(connection) {
  connection.on('data', (message) => handlePeerTransportMessage(message));
  connection.on('close', () => handlePeerDisconnect(connection));
  connection.on('error', (error) => {
    if (online.connection === connection) {
      elements.onlineStatus.textContent = `Connexion interrompue : ${formatPeerError(error)}`;
    }
  });
}

function handlePeerTransportMessage(message) {
  try {
    if (message?.type !== 'peer-packet') {
      handlePeerMessage(message);
      return;
    }
    const completeMessage = acceptPeerPacket(online.incomingPackets, message);
    if (completeMessage) {
      handlePeerMessage(completeMessage);
    }
  } catch (error) {
    online.incomingPackets.clear();
    elements.onlineStatus.textContent = `Transfert PvP interrompu : ${error.message}`;
    if (online.playerIndex === 1) {
      startRoomRequests();
    } else {
      sendPeerRoomRepeatedly();
    }
  }
}

function handlePeerMessage(message) {
  try {
    if (!message || typeof message !== 'object') {
      return;
    }
    if (online.playerIndex === 0 && message.type === 'state') {
      acceptPeerState(message.baseVersion, message.state, 1);
      return;
    }
    if (online.playerIndex === 0 && message.type === 'request-room') {
      sendPeerMeta();
      sendPeerRoom();
      return;
    }
    if (online.playerIndex === 1 && message.type === 'room-meta') {
      processOnlineRoom(message.payload, false);
      return;
    }
    if (online.playerIndex === 1 && message.type === 'room') {
      processOnlineRoom(message.payload, true);
      online.connection?.send({ type: 'room-received', version: message.payload.version });
      if (message.payload.state) {
        clearRoomRequestTimer();
      }
      return;
    }
    if (online.playerIndex === 0 && message.type === 'room-received') {
      if (message.version === online.version) {
        clearRoomRequestTimer();
      }
    }
  } catch (error) {
    elements.onlineStatus.textContent = `État reçu invalide : ${error.message}`;
    if (online.playerIndex === 1) {
      startRoomRequests();
    } else {
      sendPeerRoomRepeatedly();
    }
  }
}

function handlePeerDisconnect(connection) {
  if (online.connection !== connection) {
    return;
  }
  online.connection = null;
  online.syncPending = false;
  online.incomingPackets.clear();
  clearOnlineSyncTimer();
  clearRoomRequestTimer();
  if (online.playerIndex === 0) {
    online.status = 'waiting';
    online.players[1] = null;
    elements.onlineStatus.textContent = 'Adversaire déconnecté. Le lien permet de rejoindre à nouveau.';
  } else {
    const peer = online.peer;
    online.status = 'waiting';
    online.roomId = null;
    online.token = null;
    online.peer = null;
    peer?.destroy();
    elements.onlineStatus.textContent = 'Connexion à l’hôte interrompue. Clique sur Rejoindre le salon pour réessayer.';
    updateOnlineSetupButton();
  }
  render();
}

function processOnlineRoom(payload, forceState = false) {
  if (!isValidOnlineRoomPayload(payload)) {
    throw new Error('Réponse de salon invalide.');
  }
  if (payload.roomId !== online.roomId || payload.version < online.version) {
    return;
  }
  const hasNewState = payload.state && (forceState || payload.version > online.version);
  online.version = payload.version;
  online.status = payload.status;
  online.players = payload.players;
  online.playerIndex = payload.playerIndex;
  online.syncPending = false;
  clearOnlineSyncTimer();
  updateOnlineLobby(payload);

  if (hasNewState) {
    applyOnlineState(payload.state);
  }

  if (payload.status === 'ready' && online.playerIndex === 0 && !payload.state && !online.starting) {
    online.starting = true;
    initializeGame('online', payload.players);
  }
}

function updateOnlineLobby(payload = null) {
  if (!online.roomId) {
    elements.onlineLobby.hidden = true;
    updateOnlineSetupButton();
    return;
  }

  elements.onlineLobby.hidden = false;
  elements.onlineInviteLink.value = createOnlineInviteLink(online.roomId);
  const players = payload?.players ?? online.players ?? [];
  if (online.status === 'waiting') {
    elements.onlineStatus.textContent = `Salon ${online.roomId} créé. En attente d’un adversaire…`;
  } else if (online.status === 'ready') {
    elements.onlineStatus.textContent = online.playerIndex === 0
      ? `${players[1]} a rejoint le salon. Lancement de la partie…`
      : `Salon rejoint. ${players[0]} prépare la partie…`;
  } else if (online.status === 'playing') {
    elements.onlineStatus.textContent = `Partie en cours contre ${players[1 - online.playerIndex]}.`;
  } else if (online.status === 'finished') {
    elements.onlineStatus.textContent = online.playerIndex === 0
      ? 'Partie terminée. Tu peux lancer une revanche.'
      : 'Partie terminée. En attente d’une revanche de l’hôte.';
  }
  updateOnlineSetupButton();
}

function updateOnlineSetupButton() {
  if (selectedMode !== 'online') {
    return;
  }
  const invitationRoom = new URLSearchParams(window.location.search).get('room');
  if (!online.roomId) {
    elements.startButton.hidden = false;
    elements.startButton.disabled = false;
    elements.startButton.textContent = invitationRoom ? 'Rejoindre le salon' : 'Créer un salon';
    return;
  }
  const canRematch = online.status === 'finished' && online.playerIndex === 0;
  elements.startButton.hidden = false;
  elements.startButton.disabled = !canRematch;
  elements.startButton.textContent = canRematch ? 'Lancer la revanche' : 'Salon connecté';
}

async function syncOnlineState() {
  if (state.mode !== 'online' || !online.roomId || !online.token || online.syncPending) {
    return;
  }

  online.syncPending = true;
  render();
  try {
    const snapshot = serializeOnlineState();
    if (online.playerIndex === 0) {
      acceptPeerState(online.version, snapshot, 0);
      online.syncPending = false;
    } else if (online.connection?.open) {
      sendLargePeerMessage({
        type: 'state',
        baseVersion: online.version,
        state: snapshot,
      });
      online.syncTimer = window.setTimeout(() => {
        online.syncPending = false;
        elements.statusMessage.textContent = 'L’hôte ne répond plus. Recharge le lien pour te reconnecter.';
        render();
      }, 5000);
    } else {
      throw new Error('La connexion avec l’hôte est fermée.');
    }
  } catch (error) {
    elements.statusMessage.textContent = `Action non synchronisée : ${error.message}`;
    online.syncPending = false;
  } finally {
    online.starting = false;
    render();
  }
}

function acceptPeerState(baseVersion, snapshot, senderIndex) {
  const canPublish = baseVersion === online.version
    && isValidPeerState(snapshot)
    && (!online.authorityState || online.authorityState.gameOver
      ? senderIndex === 0
      : online.authorityState.activePlayer === senderIndex);
  if (!canPublish) {
    sendPeerRoom();
    return;
  }

  snapshot.players.forEach((player, index) => {
    player.name = online.players[index];
  });
  online.authorityState = snapshot;
  online.version += 1;
  online.status = snapshot.gameOver ? 'finished' : 'playing';
  processOnlineRoom(createPeerRoomPayload(0), true);
  sendPeerRoomRepeatedly();
}

function sendPeerRoom() {
  sendLargePeerMessage({ type: 'room', payload: createPeerRoomPayload(1) });
}

function sendPeerMeta() {
  if (!online.connection?.open) {
    return;
  }
  online.connection.send({
    type: 'room-meta',
    payload: {
      ...createPeerRoomPayload(1),
      state: null,
    },
  });
}

function sendLargePeerMessage(message) {
  if (!online.connection?.open) {
    return;
  }
  createPeerPackets(message).forEach((packet) => online.connection.send(packet));
}

function sendPeerRoomRepeatedly() {
  clearRoomRequestTimer();
  sendPeerRoom();
  let attempts = 0;
  online.roomRequestTimer = window.setInterval(() => {
    attempts += 1;
    sendPeerRoom();
    if (attempts >= 8) {
      clearRoomRequestTimer();
    }
  }, 500);
}

function startRoomRequests() {
  clearRoomRequestTimer();
  const requestRoom = () => {
    if (online.connection?.open) {
      online.connection.send({ type: 'request-room' });
    }
  };
  requestRoom();
  online.roomRequestTimer = window.setInterval(requestRoom, 600);
}

function createPeerRoomPayload(playerIndex) {
  return {
    roomId: online.roomId,
    playerIndex,
    players: [...online.players],
    status: online.status,
    version: online.version,
    state: online.authorityState,
    token: 'peer',
  };
}

function serializeOnlineState() {
  const snapshot = JSON.parse(JSON.stringify(state, (key, value) => key === 'synergies' ? undefined : value));
  snapshot.selectedCardId = null;
  snapshot.botThinking = false;
  return snapshot;
}

function applyOnlineState(snapshot) {
  state = snapshot;
  state.selectedCardId = null;
  state.botThinking = false;
  state.gameId = ++gameSequence;
  state.players.forEach((player) => {
    player.synergies = createSynergySnapshot(player.board.filter(Boolean));
  });
  elements.setupModal.hidden = true;
  elements.handoffModal.hidden = true;
  elements.resultModal.hidden = true;
  render();
  if (state.gameOver) {
    const winner = findWinner();
    if (winner !== null) {
      endGame(winner);
    }
  }
}

function createOnlineInviteLink(roomId) {
  const invite = new URL(window.location.pathname, window.location.origin);
  invite.searchParams.set('room', roomId);
  return invite.href;
}

function setOnlineRoomUrl(roomId) {
  const roomUrl = new URL(window.location.href);
  roomUrl.searchParams.set('room', roomId);
  window.history.replaceState({}, '', roomUrl);
}

async function copyOnlineInviteLink() {
  const invite = elements.onlineInviteLink.value;
  try {
    await navigator.clipboard.writeText(invite);
    elements.onlineCopyLink.textContent = 'Copié';
  } catch {
    elements.onlineInviteLink.select();
    document.execCommand('copy');
    elements.onlineCopyLink.textContent = 'Copié';
  }
  window.setTimeout(() => {
    elements.onlineCopyLink.textContent = 'Copier';
  }, 1400);
}

function resetOnlineSession() {
  const connection = online.connection;
  const peer = online.peer;
  online.roomId = null;
  online.token = null;
  online.playerIndex = null;
  online.version = -1;
  online.status = null;
  online.players = null;
  online.connection = null;
  online.peer = null;
  online.authorityState = null;
  online.incomingPackets.clear();
  online.starting = false;
  online.syncPending = false;
  clearOnlineSyncTimer();
  clearRoomRequestTimer();
  connection?.close();
  peer?.destroy();
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('room');
  window.history.replaceState({}, '', cleanUrl);
  elements.onlineLobby.hidden = true;
  updateOnlineSetupButton();
}

function ensurePeerJsAvailable() {
  if (typeof window.Peer !== 'function') {
    throw new Error('Le service PvP n’a pas pu être chargé. Vérifie ta connexion puis recharge la page.');
  }
}

function openPeer(peerId = null) {
  return new Promise((resolve, reject) => {
    const peer = peerId
      ? new window.Peer(peerId, { debug: 1 })
      : new window.Peer({ debug: 1 });
    const handleOpen = () => {
      window.clearTimeout(timeout);
      peer.off('error', handleError);
      resolve(peer);
    };
    const handleError = (error) => {
      window.clearTimeout(timeout);
      peer.off('open', handleOpen);
      peer.destroy();
      reject(error);
    };
    const timeout = window.setTimeout(() => {
      peer.off('open', handleOpen);
      peer.off('error', handleError);
      peer.destroy();
      reject(new Error('Le service PvP ne répond pas.'));
    }, 8000);
    peer.once('open', handleOpen);
    peer.once('error', handleError);
  });
}

function waitForPeerConnection(connection, peer) {
  return new Promise((resolve, reject) => {
    const handleOpen = () => {
      window.clearTimeout(timeout);
      connection.off('error', handleError);
      peer.off('error', handlePeerError);
      resolve();
    };
    const handleError = (error) => {
      window.clearTimeout(timeout);
      connection.off('open', handleOpen);
      peer.off('error', handlePeerError);
      reject(new Error(formatPeerError(error)));
    };
    const handlePeerError = (error) => {
      window.clearTimeout(timeout);
      connection.off('open', handleOpen);
      connection.off('error', handleError);
      reject(new Error(formatPeerError(error)));
    };
    const timeout = window.setTimeout(() => {
      connection.off('open', handleOpen);
      connection.off('error', handleError);
      peer.off('error', handlePeerError);
      connection.close();
      reject(new Error('Salon introuvable ou hôte hors ligne.'));
    }, 8000);
    connection.once('open', handleOpen);
    connection.once('error', handleError);
    peer.once('error', handlePeerError);
  });
}

function getInvitationRoom() {
  const roomId = new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? null;
  if (!roomId || ONLINE_ROOM_PATTERN.test(roomId)) {
    return roomId;
  }
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('room');
  window.history.replaceState({}, '', cleanUrl);
  return null;
}

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function createPeerId(roomId) {
  return `${ONLINE_PEER_PREFIX}${roomId.toLowerCase()}`;
}

function sanitizeOnlineName(name, fallback) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 24) || fallback;
}

function isValidOnlineRoomPayload(payload) {
  return Boolean(
    payload
      && ONLINE_ROOM_PATTERN.test(payload.roomId)
      && (payload.playerIndex === 0 || payload.playerIndex === 1)
      && Array.isArray(payload.players)
      && payload.players.length === 2
      && Number.isInteger(payload.version)
      && payload.version >= 0
      && ['waiting', 'ready', 'playing', 'finished'].includes(payload.status),
  );
}

function isValidPeerState(snapshot) {
  return Boolean(
    snapshot
      && snapshot.mode === 'online'
      && Array.isArray(snapshot.players)
      && snapshot.players.length === 2
      && snapshot.players.every((player) => player && typeof player.name === 'string')
      && (snapshot.activePlayer === 0 || snapshot.activePlayer === 1)
      && typeof snapshot.gameOver === 'boolean'
      && Array.isArray(snapshot.log)
      && snapshot.stats,
  );
}

function clearOnlineSyncTimer() {
  if (online.syncTimer) {
    window.clearTimeout(online.syncTimer);
    online.syncTimer = null;
  }
}

function clearRoomRequestTimer() {
  if (online.roomRequestTimer) {
    window.clearInterval(online.roomRequestTimer);
    online.roomRequestTimer = null;
  }
}

function formatPeerError(error) {
  if (error?.type === 'peer-unavailable') {
    return 'Salon introuvable ou hôte hors ligne.';
  }
  if (error?.type === 'network' || error?.type === 'server-error') {
    return 'Le service PvP est momentanément indisponible.';
  }
  return error?.message || 'Erreur de connexion PvP.';
}

function createPlayer(name, deckTemplates, healthBonus = 0) {
  return {
    name,
    health: STARTING_HEALTH + healthBonus,
    maxHealth: STARTING_HEALTH + healthBonus,
    energy: 0,
    maxEnergy: 0,
    hand: [],
    deck: shuffle(deckTemplates.map(createCardInstance)),
    board: Array(BOARD_SIZE).fill(null),
    overdriveUsed: false,
    openingEnergyBonus: 0,
    setupComplete: false,
    fatigue: 0,
    synergies: createSynergySnapshot([]),
  };
}

function createCardInstance(card) {
  return {
    ...card,
    traits: [...card.traits],
    uid: createUid(),
    health: card.baseHealth,
    maxHealth: card.baseHealth,
    healthBonus: 0,
    revived: false,
    legendaryEffectTriggered: false,
    legendarySecondaryTriggered: false,
    attackDisabledOnce: false,
  };
}

function buildCompositionDeck() {
  const usableCards = cards.filter((card) => card.imagePath && RARITY_STATS[card.rarity]);
  const featured = selectBalancedFeaturedCollections(usableCards, shuffle);
  const amounts = shuffle([7, 7, 6]);
  const deck = featured.flatMap(([, collectionCards], index) => pickForCurve(collectionCards, amounts[index]));

  return {
    cards: shuffle(deck).slice(0, DECK_SIZE),
    featuredCollections: featured.map(([, collectionCards]) => {
      const card = collectionCards[0];
      return `S${card.season} · ${card.collectionName}`;
    }),
  };
}

function pickForCurve(collectionCards, amount) {
  const desiredCosts = getArenaCostCurve(amount);
  const pool = shuffle(collectionCards.map(toBattleCard));
  const picked = [];

  desiredCosts.forEach((desiredCost) => {
    const candidates = pool
      .map((card, index) => ({ card, index, distance: Math.abs(card.cost - desiredCost) }))
      .sort((left, right) => left.distance - right.distance);
    if (candidates[0]) {
      picked.push(candidates[0].card);
      pool.splice(candidates[0].index, 1);
    }
  });

  return picked;
}

function toBattleCard(card) {
  const rarity = RARITY_STATS[card.rarity];
  const type = TYPE_STATS[card.type] ?? TYPE_STATS.classic;
  const traits = inferCardTraits(card);

  return {
    sourceId: card.id,
    name: card.name,
    description: card.description,
    imagePath: card.imagePath,
    collectionId: card.collectionId,
    collectionName: card.collectionName,
    season: card.season,
    rarity: card.rarity,
    rarityLabel: card.rarityLabel,
    type: card.type,
    traits,
    legendaryEffect: card.rarity === 'legendary' ? getLegendaryEffect(card.id) : null,
    cost: rarity.cost,
    baseAttack: Math.max(1, rarity.attack + type.attack),
    baseHealth: Math.max(1, rarity.health + type.health),
  };
}

function beginTurn(playerIndex, shouldDraw = true) {
  const player = state.players[playerIndex];
  state.activePlayer = playerIndex;
  state.selectedCardId = null;
  refreshSynergies(player);
  player.maxEnergy = Math.min(MAX_ENERGY, player.maxEnergy + 1);
  const strategistTier = player.synergies.traitTiers.get('tactician') ?? 0;
  const strategistEnergy = strategistTier === 2 ? 2 : strategistTier === 1 ? 1 : 0;
  const trajanEnergy = player.board.some((card) => card?.legendaryEffect?.id === 'roman-roads') ? 1 : 0;
  const openingEnergy = player.openingEnergyBonus;
  player.openingEnergyBonus = 0;
  player.energy = player.maxEnergy + strategistEnergy + trajanEnergy + openingEnergy;

  if (shouldDraw) {
    drawCard(player, true);
  }

  if (player.health <= 0) {
    endGame(1 - playerIndex);
    return;
  }

  const bonuses = [];
  if (strategistEnergy) {
    bonuses.push(`${strategistEnergy} par Stratège`);
  }
  if (trajanEnergy) {
    bonuses.push('1 par Tous les chemins');
  }
  if (openingEnergy) {
    bonuses.push(`${openingEnergy} par Réplique`);
  }
  const bonusMessage = bonuses.length ? `, dont ${bonuses.join(' et ')}` : '';
  addLog(`${player.name} commence son tour avec ${player.energy} énergie${bonusMessage}.`);
}

function drawCard(player, applyFatigue) {
  if (player.deck.length === 0) {
    if (applyFatigue) {
      player.fatigue += 1;
      player.health -= player.fatigue;
      state.stats.maxDamage = Math.max(state.stats.maxDamage, player.fatigue);
      addLog(`${player.name} subit ${player.fatigue} dégât${player.fatigue > 1 ? 's' : ''} de fatigue.`);
    }
    return;
  }

  const card = player.deck.shift();
  if (player.hand.length >= MAX_HAND) {
    addLog(`${player.name} a la main pleine : ${card.name} est défaussée.`);
    return;
  }
  player.hand.push(card);
}

function selectCard(cardId) {
  if (!canHumanAct()) {
    return;
  }

  const player = getActivePlayer();
  const card = player.hand.find((entry) => entry.uid === cardId);
  if (!card || card.cost > player.energy) {
    return;
  }

  state.selectedCardId = state.selectedCardId === cardId ? null : cardId;
  render();
}

function playSelectedCard(slotIndex) {
  if (!canHumanAct()) {
    return;
  }

  const player = getActivePlayer();
  const card = player.hand.find((entry) => entry.uid === state.selectedCardId);
  if (!card || player.board[slotIndex] || card.cost > player.energy) {
    return;
  }

  deployCard(state.activePlayer, card.uid, slotIndex);
  state.selectedCardId = null;
  render();
  void syncOnlineState();
}

function deployCard(playerIndex, cardId, slotIndex) {
  const player = state.players[playerIndex];
  const handIndex = player.hand.findIndex((card) => card.uid === cardId);
  if (handIndex < 0 || player.board[slotIndex]) {
    return false;
  }

  const card = player.hand[handIndex];
  if (card.cost > player.energy) {
    return false;
  }

  const previousSynergies = player.synergies;
  player.energy -= card.cost;
  player.hand.splice(handIndex, 1);
  player.board[slotIndex] = card;
  state.stats.cardsPlayed += 1;
  addLog(`${player.name} recrute ${card.name} sur la place ${slotIndex + 1}.`);
  refreshSynergies(player, true);
  logNewPowerSpikes(player, previousSynergies);
  triggerLegendaryEffect(playerIndex, card, slotIndex);

  const winner = findWinner();
  if (winner !== null) {
    endGame(winner);
  }
  return true;
}

function triggerLegendaryEffect(playerIndex, card, slotIndex) {
  const effect = card.legendaryEffect;
  if (!effect || card.legendaryEffectTriggered) {
    return;
  }

  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];
  card.legendaryEffectTriggered = true;

  if (effect.id === 'tavern-sanctuary') {
    player.maxHealth += 4;
    player.health = Math.min(player.maxHealth, player.health + 4);
  } else if (effect.id === 'last-round') {
    const woundedAlly = getMostWoundedCard(player.board.filter((unit) => unit && unit !== card));
    if (woundedAlly) {
      woundedAlly.health = Math.min(woundedAlly.maxHealth, woundedAlly.health + 5);
    }
    drawCard(player, false);
  } else if (effect.id === 'death-rocket') {
    damageCore(opponent, 3, `Super Mega Roquette de ${card.name}`);
    damageAllUnits(opponent, 1, card.name);
  } else if (effect.id === 'piltover-punch') {
    const target = opponent.board[slotIndex];
    if (target) {
      damageUnit(target, 4);
    }
    buffCard(card, 0, 2);
  } else if (effect.id === 'seraphine-anthem') {
    player.board.forEach((ally) => {
      if (ally && ally !== card) {
        buffCard(ally, 1, 0);
        ally.health = Math.min(ally.maxHealth, ally.health + 2);
      }
    });
  } else if (effect.id === 'aria-chaos') {
    triggerAriaChaos(card, opponent);
  } else if (effect.id === 'south-princess') {
    [slotIndex - 1, slotIndex + 1].forEach((index) => {
      const ally = player.board[index];
      if (ally) {
        buffCard(ally, 2, 2);
      }
    });
  } else if (effect.id === 'charm') {
    const target = opponent.board[slotIndex];
    if (target) {
      const stolenAttack = Math.min(2, Math.max(0, target.baseAttack - 1));
      target.baseAttack -= stolenAttack;
      card.baseAttack += stolenAttack;
    }
  } else if (effect.id === 'command-shot') {
    const target = getStrongestCard(opponent);
    if (target) {
      damageUnit(target, 4);
    }
  } else if (effect.id === 'glorious-evolution') {
    const target = getWeakestCard(player, card);
    if (target) {
      buffCard(target, 3, 3);
      if (!target.traits.includes('arcanist')) {
        target.traits.push('arcanist');
      }
    }
  } else if (effect.id === 'bordeaux-session') {
    drawCard(player, false);
    drawCard(player, false);
    drawCard(opponent, false);
    player.energy += 2;
  } else if (effect.id === 'knife-joke') {
    const target = opponent.board[slotIndex];
    if (target) {
      damageUnit(target, 2);
      if (target.health <= 0) {
        drawCard(player, false);
      }
    }
  } else if (effect.id === 'bought-alliance') {
    stealWeakestEnemy(player, opponent);
  } else if (effect.id === 'anthony-trap') {
    const target = getStrongestCard(opponent);
    if (target) {
      target.attackDisabledOnce = true;
    }
  } else if (effect.id === 'void-absorption') {
    const targets = opponent.board.filter(Boolean);
    targets.forEach((target) => reduceCardMaxHealth(target, 1));
    buffCard(card, targets.length, targets.length);
  } else if (effect.id === 'summer-cocktail') {
    if (player.overdriveUsed) {
      player.overdriveUsed = false;
    } else {
      player.energy += 2;
    }
  } else if (effect.id === 'stormbreaker') {
    const target = opponent.board[slotIndex];
    if (target) {
      damageUnit(target, 3);
    }
    [slotIndex - 1, slotIndex + 1].forEach((index) => {
      const adjacent = opponent.board[index];
      if (adjacent) {
        damageUnit(adjacent, 1);
      }
    });
  } else if (effect.id === 'avengers-assemble') {
    buffAdjacentAllies(player, card, slotIndex, 1, 2);
  } else if (effect.id === 'time-stone') {
    drawCard(player, false);
    player.energy += 2;
  } else if (effect.id === 'the-snap') {
    damageAllUnits(opponent, 2, card.name);
    damageUnit(card, 3);
  } else if (effect.id === 'raleigh-drift') {
    const ally = getAdjacentAlly(player, slotIndex);
    buffCard(card, 2, 2);
    if (ally) {
      buffCard(ally, 2, 2);
    }
  } else if (effect.id === 'mako-copilot') {
    const ally = getAdjacentAlly(player, slotIndex);
    buffCard(card, 1, 3);
    if (ally) {
      buffCard(ally, 1, 3);
    }
  } else if (effect.id === 'faceless-assassin') {
    const target = getStrongestCard(opponent);
    if (target) {
      const copiedAttack = Math.min(getCardAttack(target, opponent.synergies), card.baseAttack + 4);
      card.baseAttack = Math.max(card.baseAttack, copiedAttack);
    }
  } else if (effect.id === 'return-of-the-king') {
    player.board.forEach((ally) => {
      if (ally && ally !== card) {
        buffCard(ally, 1, 1);
      }
    });
    player.health = Math.min(player.maxHealth, player.health + 2);
  } else if (effect.id === 'carry-the-burden') {
    const ally = getStrongestCard(player, card);
    if (ally) {
      buffCard(ally, 2, 4);
    }
  } else if (effect.id === 'freedom-leader') {
    const allies = player.board.filter((ally) => ally && ally !== card);
    allies.forEach((ally) => buffCard(ally, 1, 0));
    buffCard(card, 0, allies.length);
  } else if (effect.id === 'radio-scout') {
    drawCard(player, false);
    const target = getStrongestCard(opponent);
    if (target) {
      target.baseAttack = Math.max(1, target.baseAttack - 1);
    }
  } else if (effect.id === 'worlds-best-boss') {
    player.board.forEach((ally) => {
      if (ally && ally !== card) {
        const attackBonus = Math.random() < 0.5;
        buffCard(ally, attackBonus ? 2 : 0, attackBonus ? 0 : 2);
      }
    });
  } else if (effect.id === 'beautiful-day') {
    healBoard(player, () => true, 3);
    player.health = Math.min(player.maxHealth, player.health + 2);
  } else if (effect.id === 'dream-project') {
    drawCard(player, false);
    drawCard(player, false);
    buffCard(card, 2, 2);
  }

  cleanDefeatedCards(opponent, opponent.synergies);
  cleanDefeatedCards(player, player.synergies);
  refreshSynergies(player, true);
  refreshSynergies(opponent);
  addLog(`${card.name} déclenche son pouvoir légendaire : ${effect.name}.`);
}

function triggerAriaChaos(card, opponent) {
  const outcome = Math.floor(Math.random() * 3);
  if (outcome === 0) {
    buffCard(card, 4, 0);
    addLog('La folie d’Aria se transforme en rage : +4 attaque.');
  } else if (outcome === 1) {
    buffCard(card, 0, 5);
    addLog('La folie d’Aria se transforme en endurance : +5 vie.');
  } else {
    damageCore(opponent, 3, 'L’explosion imprévisible d’Aria');
  }
}

function stealWeakestEnemy(player, opponent) {
  const freeSlot = player.board.findIndex((unit) => !unit);
  const target = getWeakestCard(opponent);
  if (freeSlot < 0 || !target) {
    return;
  }

  const enemySlot = opponent.board.indexOf(target);
  opponent.board[enemySlot] = null;
  target.health = Math.min(target.health, 3);
  player.board[freeSlot] = target;
  addLog(`${target.name} change de camp pour rejoindre ${player.name}.`);
}

function buffAdjacentAllies(player, source, slotIndex, attack, health) {
  [slotIndex - 1, slotIndex + 1].forEach((index) => {
    const ally = player.board[index];
    if (ally && ally !== source) {
      buffCard(ally, attack, health);
    }
  });
}

function getAdjacentAlly(player, slotIndex) {
  return [player.board[slotIndex - 1], player.board[slotIndex + 1]]
    .filter(Boolean)
    .sort((left, right) => right.baseAttack + right.health - (left.baseAttack + left.health))[0] ?? null;
}

function getStrongestCard(player, excludedCard = null) {
  return player.board
    .filter((card) => card && card !== excludedCard)
    .sort((left, right) => getCardAttack(right, player.synergies) - getCardAttack(left, player.synergies)
      || right.health - left.health)[0] ?? null;
}

function getWeakestCard(player, excludedCard = null) {
  return player.board
    .filter((unit) => unit && unit !== excludedCard)
    .sort((left, right) => left.health + left.baseAttack - (right.health + right.baseAttack))[0] ?? null;
}

function getMostWoundedCard(cards) {
  return cards
    .filter((card) => card.health < card.maxHealth)
    .sort((left, right) => (right.maxHealth - right.health) - (left.maxHealth - left.health))[0] ?? null;
}

function buffCard(card, attack, health) {
  card.baseAttack += attack;
  card.baseHealth += health;
  card.maxHealth += health;
  card.health += health;
}

function reduceCardMaxHealth(card, amount) {
  const reduction = Math.min(amount, Math.max(0, card.baseHealth - 1));
  card.baseHealth -= reduction;
  card.maxHealth = Math.max(1, card.maxHealth - reduction);
  card.health = Math.min(card.health, card.maxHealth);
}

function damageUnit(card, damage) {
  card.health -= damage;
  state.stats.maxDamage = Math.max(state.stats.maxDamage, damage);
  triggerTraumaEngine(card);
}

function damageAllUnits(player, damage, sourceName) {
  const targets = player.board.filter(Boolean);
  targets.forEach((card) => damageUnit(card, damage));
  if (targets.length) {
    addLog(`${sourceName} inflige ${damage} à toutes les unités de ${player.name}.`);
  }
}

function useOverdrive() {
  if (!canHumanAct()) {
    return;
  }

  const player = getActivePlayer();
  if (player.overdriveUsed) {
    return;
  }

  player.overdriveUsed = true;
  player.energy += 2;
  addLog(`${player.name} active sa Surcharge et gagne 2 énergie.`);
  render();
  void syncOnlineState();
}

function finishTurn(options = {}) {
  if (state.gameOver || state.botThinking && !options.fromBot) {
    return;
  }
  if (!options.fromBot && !canHumanAct()) {
    return;
  }

  const activePlayer = getActivePlayer();
  if (!activePlayer.setupComplete) {
    activePlayer.setupComplete = true;
    addLog(`${activePlayer.name} termine son déploiement initial. Aucun assaut n’est déclenché.`);
  } else {
    resolveCombat(state.activePlayer);
  }
  render();

  const winner = findWinner();
  if (winner !== null) {
    endGame(winner);
    void syncOnlineState();
    return;
  }

  const nextPlayer = 1 - state.activePlayer;
  state.turn += 1;
  beginTurn(nextPlayer, state.players[nextPlayer].setupComplete);
  if (state.gameOver) {
    void syncOnlineState();
    return;
  }

  if (state.mode === 'bot' && nextPlayer === 1) {
    render();
    runBotTurn(state.gameId);
    return;
  }
  if (state.mode === 'local') {
    showHandoff(nextPlayer);
    return;
  }
  if (state.mode === 'online') {
    render();
    void syncOnlineState();
    return;
  }
  render();
}

function resolveCombat(attackerIndex) {
  const attacker = state.players[attackerIndex];
  const defender = state.players[1 - attackerIndex];
  refreshSynergies(attacker);
  refreshSynergies(defender);
  triggerBeforeAssault(attacker, defender);
  cleanDefeatedCards(attacker, attacker.synergies);
  refreshSynergies(attacker);
  const attackerSnapshot = attacker.synergies;
  const defenderSnapshot = defender.synergies;
  addLog(`${attacker.name} lance l’assaut avec sa composition.`);

  attacker.board.forEach((attackingCard, slotIndex) => {
    if (!attackingCard) {
      return;
    }

    if (attackingCard.attackDisabledOnce) {
      attackingCard.attackDisabledOnce = false;
      addLog(`${attackingCard.name} tombe dans le piège et rate son assaut.`);
      return;
    }

    triggerBeforeLegendaryAttack(attackingCard, defender, slotIndex);
    cleanDefeatedCards(defender, defenderSnapshot);
    refreshSynergies(defender);
    const defendingCard = defender.board[slotIndex];
    const attack = getCardAttack(attackingCard, attackerSnapshot);
    if (!defendingCard) {
      damageCore(defender, attack, `${attackingCard.name} traverse la ligne`);
      return;
    }

    const counterAttack = getCardAttack(defendingCard, defenderSnapshot);
    const targetHealthBefore = defendingCard.health;
    damageUnit(defendingCard, attack);
    damageUnit(attackingCard, counterAttack);
    state.stats.maxDamage = Math.max(state.stats.maxDamage, attack, counterAttack);
    addLog(`${attackingCard.name} (${attack}) affronte ${defendingCard.name} (${counterAttack}).`);

    const arcanistTier = attackingCard.traits.includes('arcanist')
      ? attackerSnapshot.traitTiers.get('arcanist') ?? 0
      : 0;
    if (arcanistTier) {
      damageAdjacentUnits(defender, slotIndex, arcanistTier, attackingCard.name);
    }

    const marksmanTier = attackingCard.traits.includes('marksman')
      ? attackerSnapshot.traitTiers.get('marksman') ?? 0
      : 0;
    const overflow = Math.max(0, attack - targetHealthBefore);
    if (marksmanTier && overflow > 0) {
      damageCore(defender, overflow + (marksmanTier === 2 ? 2 : 0), `Débordement de ${attackingCard.name}`);
    }
    triggerAfterLegendaryCombat(attackingCard, defender, defendingCard, targetHealthBefore);
  });

  cleanDefeatedCards(attacker, attackerSnapshot);
  cleanDefeatedCards(defender, defenderSnapshot);
  applyAfterCombatEffects(attacker, attackerSnapshot);
  applyAfterCombatEffects(defender, defenderSnapshot, false);
  refreshSynergies(attacker);
  refreshSynergies(defender);
}

function triggerBeforeAssault(attacker, defender) {
  defender.board.forEach((card, slotIndex) => {
    if (card?.legendaryEffect?.id === 'thorn-garden') {
      [slotIndex - 1, slotIndex, slotIndex + 1].forEach((index) => {
        const target = attacker.board[index];
        if (target) {
          damageUnit(target, 1);
        }
      });
      addLog(`Le Jardin de ronces de ${card.name} blesse les assaillants.`);
    } else if (card?.legendaryEffect?.id === 'wildfire' && !card.legendarySecondaryTriggered) {
      card.legendarySecondaryTriggered = true;
      damageAllUnits(attacker, 1, card.name);
      addLog(`Le Feu grégeois de ${card.name} embrase les assaillants.`);
    }
  });
}

function triggerBeforeLegendaryAttack(card, defender, slotIndex) {
  if (card.legendaryEffect?.id !== 'final-spark' || card.legendarySecondaryTriggered) {
    return;
  }

  card.legendarySecondaryTriggered = true;
  [slotIndex - 1, slotIndex, slotIndex + 1].forEach((index) => {
    const target = defender.board[index];
    if (target) {
      damageUnit(target, 2);
    }
  });
  addLog(`${card.name} déclenche Final Spark avant son combat.`);
}

function triggerAfterLegendaryCombat(attacker, defender, target, targetHealthBefore) {
  if (attacker.legendaryEffect?.id === 'relentless-slasher' && targetHealthBefore > 0 && target.health <= 0) {
    buffCard(attacker, 1, 0);
    damageCore(defender, 2, `Le Trancheur sans répit de ${attacker.name}`);
  }

  triggerTraumaEngine(attacker);
  triggerTraumaEngine(target);
}

function triggerTraumaEngine(card) {
  if (card.legendaryEffect?.id !== 'trauma-engine'
    || card.legendarySecondaryTriggered
    || card.health > card.maxHealth / 2) {
    return;
  }
  card.legendarySecondaryTriggered = true;
  buffCard(card, 3, 0);
  card.health = Math.min(card.maxHealth, card.health + 3);
  addLog(`${card.name} transforme son traumatisme en puissance.`);
}

function damageAdjacentUnits(defender, targetIndex, damage, sourceName) {
  [targetIndex - 1, targetIndex + 1].forEach((index) => {
    const adjacent = defender.board[index];
    if (adjacent) {
      damageUnit(adjacent, damage);
      addLog(`${sourceName} éclabousse ${adjacent.name} pour ${damage}.`);
    }
  });
}

function damageCore(player, damage, source) {
  player.health -= damage;
  state.stats.maxDamage = Math.max(state.stats.maxDamage, damage);
  addLog(`${source} et inflige ${damage} au noyau de ${player.name}.`);
}

function cleanDefeatedCards(player, snapshot) {
  const survivorTier = snapshot.traitTiers.get('survivor') ?? 0;
  const lotus = player.board.find((card) => card?.legendaryEffect?.id === 'lotus-dream'
    && !card.legendarySecondaryTriggered
    && card.health > 0);
  player.board = player.board.map((card) => {
    if (!card || card.health > 0) {
      return card;
    }

    if (card.legendaryEffect?.id === 'gm-favor' && !card.legendarySecondaryTriggered) {
      card.legendarySecondaryTriggered = true;
      card.health = card.maxHealth;
      addLog(`${card.name} revient avec toute sa vie grâce à la Faveur du MJ.`);
      return card;
    }
    if (card.legendaryEffect?.id === 'king-in-the-north' && !card.legendarySecondaryTriggered) {
      card.legendarySecondaryTriggered = true;
      card.health = Math.min(3, card.maxHealth);
      player.board.forEach((ally) => {
        if (ally && ally !== card) {
          buffCard(ally, 1, 0);
        }
      });
      addLog(`${card.name} revient et rallie les alliés du Nord.`);
      return card;
    }
    if (card.legendaryEffect?.id === 'still-alive' && !card.legendarySecondaryTriggered) {
      card.legendarySecondaryTriggered = true;
      card.baseAttack = Math.max(1, card.baseAttack - 2);
      card.health = card.maxHealth;
      addLog(`${card.name} survit encore une fois et revient avec toute sa vie.`);
      return card;
    }
    if (card.legendaryEffect?.id === 'endgame-sacrifice' && !card.legendarySecondaryTriggered) {
      card.legendarySecondaryTriggered = true;
      const opponent = state.players[1 - state.players.indexOf(player)];
      if (opponent) {
        damageCore(opponent, 4, `Le sacrifice final de ${card.name}`);
      }
    }
    if (lotus && lotus !== card && !lotus.legendarySecondaryTriggered) {
      lotus.legendarySecondaryTriggered = true;
      card.health = 1;
      addLog(`${lotus.name} sauve ${card.name} grâce au Rêve de Lotus.`);
      return card;
    }
    if (survivorTier === 2 && card.traits.includes('survivor') && !card.revived) {
      card.revived = true;
      card.health = Math.min(3, card.maxHealth);
      addLog(`${card.name} revient grâce à Survivant.`);
      return card;
    }
    addLog(`${card.name} de ${player.name} est détruite.`);
    return null;
  });
}

function applyAfterCombatEffects(player, snapshot, canSupportHeal = true) {
  const supportTier = snapshot.traitTiers.get('support') ?? 0;
  if (canSupportHeal && supportTier) {
    const heal = supportTier === 2 ? 2 : 1;
    healBoard(player, () => true, heal);
    addLog(`Soutien rend ${heal} vie à l’équipe de ${player.name}.`);
  }

  const survivorTier = snapshot.traitTiers.get('survivor') ?? 0;
  if (survivorTier) {
    healBoard(player, (card) => card.traits.includes('survivor'), 1);
  }
}

function healBoard(player, predicate, amount) {
  player.board.forEach((card) => {
    if (card && predicate(card)) {
      card.health = Math.min(card.maxHealth, card.health + amount);
    }
  });
}

async function runBotTurn(gameId) {
  state.botThinking = true;
  render();
  await wait(620);
  if (!isCurrentGame(gameId)) {
    return;
  }

  const bot = state.players[1];
  if (shouldBotUseOverdrive(bot)) {
    bot.overdriveUsed = true;
    bot.energy += 2;
    addLog(`${bot.name} active sa Surcharge.`);
    render();
    await wait(380);
  }

  let plays = 0;
  while (isCurrentGame(gameId)) {
    const choice = chooseBotPlay(bot);
    if (!choice) {
      break;
    }
    deployCard(1, choice.card.uid, choice.slot);
    plays += 1;
    render();
    await wait(state.difficulty === 'champion' ? 300 : 450);
    if (state.difficulty === 'rookie' && plays >= 1 && Math.random() < 0.32) {
      break;
    }
  }

  if (!isCurrentGame(gameId)) {
    return;
  }
  await wait(400);
  state.botThinking = false;
  finishTurn({ fromBot: true });
}

function shouldBotUseOverdrive(bot) {
  if (bot.overdriveUsed || state.difficulty === 'rookie') {
    return false;
  }
  const freeSlot = bot.board.some((card) => !card);
  const usefulCard = bot.hand.some((card) => card.cost > bot.energy && card.cost <= bot.energy + 2);
  return freeSlot && usefulCard && (state.difficulty === 'champion' || bot.energy <= 3 || bot.health <= 12);
}

function chooseBotPlay(bot) {
  const affordable = bot.hand.filter((card) => card.cost <= bot.energy);
  const freeSlots = bot.board
    .map((card, index) => (card ? null : index))
    .filter((index) => index !== null);
  if (affordable.length === 0 || freeSlots.length === 0) {
    return null;
  }

  const options = affordable.flatMap((card) => freeSlots.map((slot) => ({
    card,
    slot,
    score: scoreBotPlay(card, slot),
  })));
  if (state.difficulty === 'rookie') {
    return options[Math.floor(Math.random() * options.length)];
  }

  options.sort((left, right) => right.score - left.score);
  if (state.difficulty === 'tactician' && options.length > 1 && Math.random() < 0.16) {
    return options[1];
  }
  return options[0];
}

function scoreBotPlay(card, slot) {
  const bot = state.players[1];
  const human = state.players[0];
  const target = human.board[slot];
  let score = card.baseAttack * 1.25 + card.baseHealth - card.cost * 0.3 + Math.random() * 0.2;
  if (card.legendaryEffect) {
    score += 2;
  }

  if (!target) {
    score += card.baseAttack;
  } else {
    if (card.baseAttack >= target.health) {
      score += 4;
    }
    if (card.baseHealth > getCardAttack(target, human.synergies)) {
      score += 1.5;
    }
  }

  const currentCollectionCount = bot.board.filter((unit) => unit?.collectionId === card.collectionId).length;
  if (currentCollectionCount === 1 || currentCollectionCount === 3) {
    score += 6;
  }
  card.traits.forEach((trait) => {
    const currentTraitCount = bot.board.filter((unit) => unit?.traits.includes(trait)).length;
    if (currentTraitCount === 1 || currentTraitCount === 3) {
      score += 4;
    }
  });
  return score;
}

function refreshSynergies(player, healNewBonuses = false) {
  const snapshot = createSynergySnapshot(player.board.filter(Boolean));
  player.synergies = snapshot;

  player.board.forEach((card) => {
    if (!card) {
      return;
    }
    const collectionTier = snapshot.collectionTiers.get(card.collectionId) ?? 0;
    const rempartTier = card.traits.includes('bulwark') ? snapshot.traitTiers.get('bulwark') ?? 0 : 0;
    const collectionHealth = COLLECTION_BONUSES[collectionTier].health;
    const rempartHealth = rempartTier === 2 ? 5 : rempartTier === 1 ? 2 : 0;
    const nextBonus = collectionHealth + rempartHealth;
    const difference = nextBonus - card.healthBonus;
    card.healthBonus = nextBonus;
    card.maxHealth = card.baseHealth + nextBonus;
    if (healNewBonuses && difference > 0) {
      card.health += difference;
    }
    card.health = Math.min(card.health, card.maxHealth);
  });
}

function createSynergySnapshot(board) {
  const collectionCounts = countBy(board, (card) => card.collectionId);
  const collectionNames = new Map(board.map((card) => [card.collectionId, card.collectionName]));
  const traitCounts = new Map();
  board.forEach((card) => {
    card.traits.forEach((trait) => traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1));
  });

  return {
    collectionCounts,
    collectionNames,
    collectionTiers: new Map(Array.from(collectionCounts, ([id, count]) => [id, getCompositionTier(count)])),
    traitCounts,
    traitTiers: new Map(Array.from(traitCounts, ([trait, count]) => [trait, getTraitTier(count, trait)])),
  };
}

function getCompositionTier(count) {
  if (count >= 4) {
    return 2;
  }
  if (count >= 2) {
    return 1;
  }
  return 0;
}

function getCardAttack(card, snapshot) {
  const collectionTier = snapshot.collectionTiers.get(card.collectionId) ?? 0;
  const assaultTier = card.traits.includes('assault') ? snapshot.traitTiers.get('assault') ?? 0 : 0;
  const assaultAttack = assaultTier === 2 ? 3 : assaultTier === 1 ? 1 : 0;
  return card.baseAttack + COLLECTION_BONUSES[collectionTier].attack + assaultAttack;
}

function logNewPowerSpikes(player, previousSnapshot) {
  const active = getVisibleSynergies(player).filter((synergy) => {
    const previousTier = synergy.kind === 'collection'
      ? previousSnapshot.collectionTiers.get(synergy.sourceKey) ?? 0
      : previousSnapshot.traitTiers.get(synergy.sourceKey) ?? 0;
    return synergy.tier > previousTier;
  });
  active.forEach((synergy) => {
    addLog(`${player.name} active ${synergy.name} palier ${synergy.tier}.`);
  });
}

function getVisibleSynergies(player) {
  const snapshot = player.synergies;
  const collections = Array.from(snapshot.collectionCounts, ([id, count]) => {
    const tier = snapshot.collectionTiers.get(id) ?? 0;
    return {
      key: `collection-${id}`,
      sourceKey: id,
      kind: 'collection',
      name: snapshot.collectionNames.get(id),
      glyph: 'O',
      color: '#f6c453',
      count,
      tier,
      thresholds: [2, 4],
      description: tier === 2
        ? 'Les membres gagnent +2 attaque et +3 vie.'
        : 'Les membres gagnent +1 attaque et +1 vie.',
    };
  });
  const traits = Array.from(snapshot.traitCounts, ([trait, count]) => {
    const definition = TRAIT_DEFINITIONS[trait];
    const tier = snapshot.traitTiers.get(trait) ?? 0;
    return {
      key: trait,
      sourceKey: trait,
      kind: 'trait',
      name: definition.name,
      glyph: definition.glyph,
      color: definition.color,
      count,
      tier,
      thresholds: definition.thresholds,
      description: definition.descriptions[Math.max(0, tier - 1)],
    };
  });

  return [...collections, ...traits]
    .sort((left, right) => right.tier - left.tier || right.count - left.count || left.name.localeCompare(right.name));
}

function showHandoff(nextPlayer) {
  elements.handoffMessage.textContent = `${state.players[nextPlayer].name}, prends l’écran sans révéler ta composition à ton adversaire.`;
  elements.handoffModal.hidden = false;
  renderHiddenState();
}

function endGame(winnerIndex) {
  state.gameOver = true;
  state.botThinking = false;
  state.selectedCardId = null;
  const winner = state.players[winnerIndex];
  const loser = state.players[1 - winnerIndex];
  const humanVictory = state.mode === 'bot' && winnerIndex === 0;

  if (humanVictory) {
    const wins = readRecord() + 1;
    writeRecord(wins);
    elements.recordWins.textContent = String(wins);
  }

  elements.resultKicker.textContent = humanVictory ? 'Victoire enregistrée' : 'Duel terminé';
  elements.resultTitle.textContent = `${winner.name} remporte le duel`;
  elements.resultMessage.textContent = `${loser.name} n’a plus de points de noyau.`;
  elements.resultRounds.textContent = String(getRound());
  elements.resultCards.textContent = String(state.stats.cardsPlayed);
  elements.resultDamage.textContent = String(state.stats.maxDamage);
  elements.rematchButton.disabled = state.mode === 'online' && online.playerIndex !== 0;
  elements.rematchButton.textContent = state.mode === 'online' && online.playerIndex !== 0
    ? 'En attente de l’hôte'
    : 'Rejouer';
  elements.resultModal.hidden = false;
  render();
}

function findWinner() {
  if (state.players[0].health <= 0) {
    return 1;
  }
  if (state.players[1].health <= 0) {
    return 0;
  }
  return null;
}

function canHumanAct() {
  if (state.gameOver || state.botThinking || online.syncPending || elements.handoffModal.hidden === false) {
    return false;
  }
  if (state.mode === 'online') {
    return online.status === 'playing' && state.activePlayer === online.playerIndex;
  }
  return state.mode === 'local' || state.activePlayer === 0;
}

function render() {
  if (state.players.length < 2) {
    renderEmptyArena();
    return;
  }

  const viewIndex = state.mode === 'local'
    ? state.activePlayer
    : state.mode === 'online' ? online.playerIndex ?? 0 : 0;
  const player = state.players[viewIndex];
  const opponent = state.players[1 - viewIndex];
  const active = getActivePlayer();
  const isInteractive = canHumanAct();
  refreshSynergies(player);
  refreshSynergies(opponent);

  elements.roundLabel.textContent = `Manche ${getRound()} · Tour de ${active.name}`;
  elements.statusMessage.textContent = buildStatusMessage(active, isInteractive);
  renderFeaturedCollections();
  renderFighter(player, opponent);
  renderBoard(elements.playerBoard, player, isInteractive && viewIndex === state.activePlayer);
  renderBoard(elements.opponentBoard, opponent, false);
  renderSynergies(elements.playerSynergies, player);
  renderSynergies(elements.opponentSynergies, opponent);
  renderHand(player, isInteractive && viewIndex === state.activePlayer);
  renderHiddenHand(opponent.hand.length);
  renderControls(player, isInteractive && viewIndex === state.activePlayer);
  renderLog();
}

function renderEmptyArena() {
  renderEmptyBoard(elements.playerBoard);
  renderEmptyBoard(elements.opponentBoard);
  elements.playerSynergies.innerHTML = renderEmptySynergy();
  elements.opponentSynergies.innerHTML = renderEmptySynergy();
  elements.playerHand.innerHTML = '<div class="empty-hand">Lance une partie pour découvrir ta composition.</div>';
  elements.opponentHand.innerHTML = '';
  elements.overdriveButton.disabled = true;
  elements.endTurnButton.disabled = true;
}

function renderHiddenState() {
  elements.playerHand.innerHTML = '<div class="empty-hand">Main et composition masquées pendant le passage de l’écran.</div>';
  renderEmptyBoard(elements.playerBoard);
  renderEmptyBoard(elements.opponentBoard);
  elements.playerSynergies.innerHTML = renderEmptySynergy();
  elements.opponentSynergies.innerHTML = renderEmptySynergy();
  elements.overdriveButton.disabled = true;
  elements.endTurnButton.disabled = true;
  elements.statusMessage.textContent = 'Passe l’écran au prochain joueur.';
}

function renderEmptyBoard(container) {
  container.innerHTML = Array.from({ length: BOARD_SIZE }, (_, slotIndex) => renderEmptySlot(slotIndex, false)).join('');
}

function renderFeaturedCollections() {
  elements.featuredCollections.hidden = false;
  elements.featuredCollections.innerHTML = `
    <span>Deck :</span>
    ${state.featuredCollections.map((name) => `<strong>${escapeHtml(name)}</strong>`).join('')}
  `;
}

function renderFighter(player, opponent) {
  elements.playerName.textContent = player.name;
  elements.opponentName.textContent = opponent.name;
  elements.playerAvatar.textContent = player.name === 'Joueur 1' ? 'J1' : 'J2';
  elements.opponentAvatar.textContent = state.mode === 'bot' && opponent === state.players[1]
    ? 'IA'
    : opponent.name === 'Joueur 1' ? 'J1' : 'J2';
  elements.playerHealth.textContent = String(Math.max(0, player.health));
  elements.opponentHealth.textContent = String(Math.max(0, opponent.health));
  elements.playerEnergy.textContent = `${player.energy} / ${player.maxEnergy}`;
  elements.opponentEnergy.textContent = `${opponent.energy} / ${opponent.maxEnergy}`;
  elements.playerDeck.textContent = `Pioche : ${player.deck.length}`;
  elements.opponentDeck.textContent = `Pioche : ${opponent.deck.length}`;
}

function renderBoard(container, player, interactive) {
  container.innerHTML = player.board.map((card, slotIndex) => {
    if (!card) {
      return renderEmptySlot(slotIndex, interactive && Boolean(state.selectedCardId));
    }
    return `
      <div class="battle-slot battle-slot--occupied" data-slot-label="Place ${slotIndex + 1}">
        ${renderUnitCard(card, player.synergies)}
      </div>
    `;
  }).join('');

  if (interactive) {
    container.querySelectorAll('[data-slot]').forEach((slot) => {
      slot.addEventListener('click', () => playSelectedCard(Number(slot.dataset.slot)));
    });
  }
  bindImageFallbacks(container);
}

function renderEmptySlot(slotIndex, available) {
  return `
    <button
      class="battle-slot ${available ? 'battle-slot--available' : ''}"
      type="button"
      data-slot="${slotIndex}"
      data-slot-label="Place ${slotIndex + 1}"
      ${available ? '' : 'disabled'}
      aria-label="${available ? `Recruter sur la place ${slotIndex + 1}` : `Place ${slotIndex + 1} vide`}"
    >
      <span class="battle-slot__rune">${slotIndex + 1}</span>
    </button>
  `;
}

function renderUnitCard(card, snapshot) {
  const attack = getCardAttack(card, snapshot);
  const legendaryTitle = card.legendaryEffect
    ? ` · ${card.legendaryEffect.name} : ${card.legendaryEffect.description}`
    : '';
  return `
    <article class="unit-card unit-card--${escapeHtml(card.rarity)}" title="${escapeHtml(card.name)} · ${escapeHtml(card.collectionName)}${escapeHtml(legendaryTitle)}">
      <div class="unit-card__portrait">
        <img class="unit-card__image" src="${escapeHtml(card.imagePath)}" alt="" />
      </div>
      ${renderLegendaryPowerBadge(card)}
      <span class="unit-card__origin">${escapeHtml(card.collectionName)}</span>
      <strong class="unit-card__name">${escapeHtml(card.name)}</strong>
      <div class="unit-card__traits">${card.traits.map(renderMiniTrait).join('')}</div>
      <div class="unit-card__stats">
        <span class="stat-orb stat-orb--attack" title="Attaque">${attack}</span>
        <span class="stat-orb stat-orb--health" title="Vie">${Math.max(0, card.health)}</span>
      </div>
    </article>
  `;
}

function renderHand(player, interactive) {
  if (player.hand.length === 0) {
    elements.playerHand.innerHTML = '<div class="empty-hand">Ta main est vide.</div>';
    return;
  }

  elements.playerHand.innerHTML = player.hand.map((card, index) => {
    const selected = state.selectedCardId === card.uid;
    const disabled = !interactive || card.cost > player.energy;
    const tilt = Math.max(-4, Math.min(4, index - (player.hand.length - 1) / 2));
    return `
      <button
        class="duel-card duel-card--${escapeHtml(card.rarity)} ${selected ? 'duel-card--selected' : ''}"
        type="button"
        data-card-id="${escapeHtml(card.uid)}"
        style="--card-tilt: ${tilt}deg"
        ${disabled ? 'disabled' : ''}
        title="${escapeHtml(card.description)}${card.legendaryEffect ? ` · ${escapeHtml(card.legendaryEffect.name)} : ${escapeHtml(card.legendaryEffect.description)}` : ''}"
      >
        <span class="duel-card__frame">
          <span class="duel-card__portrait">
            <img class="duel-card__image" src="${escapeHtml(card.imagePath)}" alt="" />
          </span>
          <span class="duel-card__cost" title="Coût">${card.cost}</span>
          <span class="duel-card__body">
            <strong class="duel-card__name">${escapeHtml(card.name)}</strong>
            <span class="duel-card__origin">${escapeHtml(card.collectionName)}</span>
            <span class="duel-card__traits">${card.traits.map(renderTraitBadge).join('')}</span>
            ${card.legendaryEffect ? `<span class="duel-card__power">L · ${escapeHtml(card.legendaryEffect.name)}</span>` : ''}
          </span>
          <span class="duel-card__stats">
            <span class="stat-orb stat-orb--attack">${card.baseAttack}</span>
            <span class="stat-orb stat-orb--health">${card.baseHealth}</span>
          </span>
        </span>
      </button>
    `;
  }).join('');

  if (interactive) {
    elements.playerHand.querySelectorAll('[data-card-id]').forEach((button) => {
      button.addEventListener('click', () => selectCard(button.dataset.cardId));
    });
  }
  bindImageFallbacks(elements.playerHand);
}

function renderMiniTrait(trait) {
  const definition = TRAIT_DEFINITIONS[trait];
  return `<span class="mini-trait" style="--trait-color: ${definition.color}" title="${definition.name}">${definition.glyph}</span>`;
}

function renderLegendaryPowerBadge(card) {
  if (!card.legendaryEffect) {
    return '';
  }
  return `<span class="legendary-power" title="${escapeHtml(card.legendaryEffect.description)}">L</span>`;
}

function renderTraitBadge(trait) {
  const definition = TRAIT_DEFINITIONS[trait];
  return `
    <span class="card-trait" style="--trait-color: ${definition.color}">
      <i>${definition.glyph}</i>${definition.name}
    </span>
  `;
}

function renderSynergies(container, player) {
  const synergies = getVisibleSynergies(player);
  container.innerHTML = synergies.length
    ? synergies.map(renderSynergyChip).join('')
    : renderEmptySynergy();
}

function renderSynergyChip(synergy) {
  const nextThreshold = synergy.tier >= 2 ? synergy.thresholds[1] : synergy.thresholds[synergy.tier];
  const activeClass = synergy.tier ? `synergy-chip--active synergy-chip--tier-${synergy.tier}` : '';
  return `
    <div class="synergy-chip ${activeClass}" style="--synergy-color: ${synergy.color}" title="${escapeHtml(synergy.description)}">
      <span class="synergy-chip__icon">${synergy.glyph}</span>
      <span class="synergy-chip__copy">
        <strong>${escapeHtml(synergy.name)}</strong>
        <small>${synergy.kind === 'collection' ? 'Origine' : 'Trait'} · ${synergy.count}/${nextThreshold}</small>
      </span>
      <span class="synergy-chip__tier">${synergy.tier ? `P${synergy.tier}` : ''}</span>
    </div>
  `;
}

function renderEmptySynergy() {
  return '<span class="synergy-rack__empty">Déploie des unités pour former une composition</span>';
}

function renderHiddenHand(amount) {
  elements.opponentHand.innerHTML = Array.from({ length: amount }, () => '<span class="hidden-card"></span>').join('');
  elements.opponentHand.setAttribute('aria-label', `Main adverse : ${amount} cartes`);
}

function renderControls(player, interactive) {
  const selectedCard = player.hand.find((card) => card.uid === state.selectedCardId);
  const freeSlots = player.board.filter((card) => !card).length;
  elements.overdriveButton.disabled = !interactive || player.overdriveUsed;
  elements.endTurnButton.disabled = !interactive;

  if (selectedCard) {
    const powerHint = selectedCard.legendaryEffect
      ? ` Pouvoir ${selectedCard.legendaryEffect.name} : ${selectedCard.legendaryEffect.description}`
      : '';
    elements.handHint.textContent = freeSlots
      ? `Choisis une place pour recruter ${selectedCard.name}.${powerHint}`
      : 'Ton escouade est complète.';
  } else if (!freeSlots) {
    elements.handHint.textContent = 'Ton escouade est complète : lance l’assaut.';
  } else {
    elements.handHint.textContent = 'Sélectionne une carte et complète ta composition.';
  }

  elements.overdriveButton.innerHTML = player.overdriveUsed
    ? 'Surcharge <span>déjà utilisée</span>'
    : 'Surcharge <span>+2 énergie</span>';
}

function buildStatusMessage(active, interactive) {
  if (state.gameOver) {
    return 'La partie est terminée.';
  }
  if (state.botThinking) {
    return `${active.name} cherche son prochain palier de composition…`;
  }
  if (state.mode === 'online' && online.syncPending) {
    return 'Synchronisation de l’action…';
  }
  if (state.mode === 'online' && active !== state.players[online.playerIndex]) {
    return `Tour de ${active.name}. En attente de son action…`;
  }
  if (interactive) {
    if (!active.setupComplete) {
      return 'Prépare ta ligne : ton déploiement initial ne déclenche aucun assaut.';
    }
    return 'Recrute des cartes, active tes paliers puis lance l’assaut.';
  }
  return `Tour de ${active.name}.`;
}

function renderLog() {
  elements.logList.innerHTML = state.log
    .slice()
    .reverse()
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join('');
}

function toggleLog() {
  const expanded = elements.logToggle.getAttribute('aria-expanded') === 'true';
  elements.logToggle.setAttribute('aria-expanded', String(!expanded));
  elements.logList.hidden = expanded;
}

function addLog(message) {
  state.log.push(message);
  if (state.log.length > 50) {
    state.log.shift();
  }
}

function getActivePlayer() {
  return state.players[state.activePlayer];
}

function getRound() {
  return Math.ceil(state.turn / 2);
}

function isCurrentGame(gameId) {
  return state.gameId === gameId && !state.gameOver;
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

function countBy(input, selector) {
  const result = new Map();
  input.forEach((entry) => {
    const key = selector(entry);
    result.set(key, (result.get(key) ?? 0) + 1);
  });
  return result;
}

function bindImageFallbacks(container) {
  container.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => {
      image.classList.add('card-image--missing');
      image.removeAttribute('src');
    }, { once: true });
  });
}

function shuffle(input) {
  const result = [...input];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function readRecord() {
  try {
    return Number.parseInt(localStorage.getItem(RECORD_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeRecord(value) {
  try {
    localStorage.setItem(RECORD_KEY, String(value));
  } catch {
    // The duel remains playable when storage is unavailable.
  }
}
