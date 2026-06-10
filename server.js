import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT ? Number(process.env.PORT) : 3002;
const publicDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
};

const ROOM_TTL = 6 * 60 * 60 * 1000;
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const ALLOWED_TRAITS = new Set(['assault', 'bulwark', 'arcanist', 'support', 'marksman', 'survivor', 'tactician']);
const rooms = new Map();

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal server error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = decodeURIComponent(requestUrl.pathname);

  const roomApiPath = normalizeRoomApiPath(requestUrl);
  if (roomApiPath) {
    handleRoomApi(req, res, roomApiPath);
    return;
  }

  let filePath = path.join(publicDir, urlPath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (urlPath === '/' || urlPath === '') {
        serveFile(path.join(publicDir, 'index.html'), res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      }
      return;
    }

    if (stats.isDirectory()) {
      serveFile(path.join(filePath, 'index.html'), res);
      return;
    }

    serveFile(filePath, res);
  });
});

server.listen(port, () => {
  console.log(`CartDLE server listening on http://localhost:${port}`);
});

setInterval(() => {
  const expiration = Date.now() - ROOM_TTL;
  rooms.forEach((room, roomId) => {
    if (room.updatedAt < expiration) {
      rooms.delete(roomId);
    }
  });
}, 10 * 60 * 1000).unref();

async function handleRoomApi(req, res, urlPath) {
  try {
    if (req.method === 'POST' && urlPath === '/api/rooms') {
      const body = await readJsonBody(req);
      const room = createRoom(body?.name);
      sendJson(res, 201, createRoomResponse(room, 0));
      return;
    }

    const match = urlPath.match(/^\/api\/rooms\/([A-Z0-9]{6})(?:\/join)?$/i);
    if (!match) {
      sendJson(res, 404, { error: 'Salon introuvable.' });
      return;
    }

    const roomId = match[1].toUpperCase();
    const room = rooms.get(roomId);
    if (!room) {
      sendJson(res, 404, { error: 'Ce salon n’existe plus.' });
      return;
    }

    if (req.method === 'POST' && urlPath.endsWith('/join')) {
      const body = await readJsonBody(req);
      if (room.players[1]) {
        sendJson(res, 409, { error: 'Ce salon est déjà complet.' });
        return;
      }
      room.players[1] = createRoomPlayer(body?.name, 1);
      touchRoom(room);
      sendJson(res, 200, createRoomResponse(room, 1));
      return;
    }

    const playerIndex = authenticateRoomPlayer(room, req.headers['x-player-token']);
    if (playerIndex === null) {
      sendJson(res, 401, { error: 'Jeton de joueur invalide.' });
      return;
    }

    if (req.method === 'GET') {
      touchRoom(room);
      sendJson(res, 200, createRoomResponse(room, playerIndex));
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!Number.isInteger(body?.baseVersion) || body.baseVersion !== room.version) {
        sendJson(res, 409, { error: 'La partie a évolué.', version: room.version });
        return;
      }
      if (!isValidOnlineState(body?.state)) {
        sendJson(res, 400, { error: 'État de partie invalide.' });
        return;
      }
      if (!canPublishState(room, playerIndex)) {
        sendJson(res, 403, { error: 'Ce n’est pas à vous de jouer.' });
        return;
      }

      body.state.players.forEach((player, index) => {
        player.name = room.players[index].name;
      });
      room.state = body.state;
      room.version += 1;
      touchRoom(room);
      sendJson(res, 200, createRoomResponse(room, playerIndex));
      return;
    }

    sendJson(res, 405, { error: 'Méthode non autorisée.' });
  } catch (error) {
    const status = error.code === 'BODY_TOO_LARGE' ? 413 : 400;
    sendJson(res, status, { error: error.message || 'Requête invalide.' });
  }
}

function createRoom(name) {
  let roomId;
  do {
    roomId = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  } while (rooms.has(roomId));

  const room = {
    id: roomId,
    players: [createRoomPlayer(name, 0), null],
    state: null,
    version: 0,
    updatedAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

function createRoomPlayer(name, index) {
  return {
    name: sanitizePlayerName(name, `Joueur ${index + 1}`),
    token: crypto.randomBytes(24).toString('base64url'),
  };
}

function sanitizePlayerName(name, fallback) {
  const cleanName = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  return cleanName || fallback;
}

function authenticateRoomPlayer(room, token) {
  const playerIndex = room.players.findIndex((player) => player?.token === token);
  return playerIndex >= 0 ? playerIndex : null;
}

function canPublishState(room, playerIndex) {
  if (!room.players[1]) {
    return false;
  }
  if (!room.state || room.state.gameOver) {
    return playerIndex === 0;
  }
  return room.state.activePlayer === playerIndex;
}

function isValidOnlineState(state) {
  return Boolean(
    state
      && state.mode === 'online'
      && Array.isArray(state.players)
      && state.players.length === 2
      && state.players.every(isValidOnlinePlayer)
      && (state.activePlayer === 0 || state.activePlayer === 1)
      && (state.startingPlayer === 0 || state.startingPlayer === 1)
      && Number.isInteger(state.turn)
      && state.turn > 0
      && typeof state.gameOver === 'boolean'
      && Array.isArray(state.featuredCollections)
      && state.featuredCollections.every((name) => typeof name === 'string')
      && Array.isArray(state.log)
      && state.log.every((entry) => typeof entry === 'string')
      && state.stats
      && Number.isFinite(state.stats.cardsPlayed)
      && Number.isFinite(state.stats.maxDamage),
  );
}

function isValidOnlinePlayer(player) {
  return Boolean(
    player
      && typeof player.name === 'string'
      && Number.isFinite(player.health)
      && Number.isFinite(player.maxHealth)
      && Number.isFinite(player.energy)
      && Number.isFinite(player.maxEnergy)
      && Number.isFinite(player.openingEnergyBonus)
      && Number.isFinite(player.fatigue)
      && typeof player.overdriveUsed === 'boolean'
      && typeof player.setupComplete === 'boolean'
      && Array.isArray(player.hand)
      && player.hand.every(isValidOnlineCard)
      && Array.isArray(player.deck)
      && player.deck.every(isValidOnlineCard)
      && Array.isArray(player.board)
      && player.board.length === 5
      && player.board.every((card) => card === null || isValidOnlineCard(card)),
  );
}

function isValidOnlineCard(card) {
  return Boolean(
    card
      && typeof card.sourceId === 'string'
      && typeof card.uid === 'string'
      && typeof card.name === 'string'
      && typeof card.description === 'string'
      && typeof card.imagePath === 'string'
      && typeof card.collectionName === 'string'
      && typeof card.rarity === 'string'
      && typeof card.rarityLabel === 'string'
      && typeof card.type === 'string'
      && Array.isArray(card.traits)
      && card.traits.length === 2
      && card.traits.every((trait) => ALLOWED_TRAITS.has(trait))
      && Number.isFinite(card.cost)
      && Number.isFinite(card.baseAttack)
      && Number.isFinite(card.baseHealth)
      && Number.isFinite(card.health)
      && Number.isFinite(card.maxHealth)
      && Number.isFinite(card.healthBonus)
      && (card.legendaryEffect === null || card.legendaryEffect === undefined || isValidLegendaryEffect(card.legendaryEffect)),
  );
}

function isValidLegendaryEffect(effect) {
  return Boolean(
    effect
      && typeof effect.id === 'string'
      && typeof effect.name === 'string'
      && typeof effect.description === 'string',
  );
}

function createRoomResponse(room, playerIndex) {
  return {
    roomId: room.id,
    playerIndex,
    players: room.players.map((player) => player?.name ?? null),
    status: getRoomStatus(room),
    version: room.version,
    state: room.state,
    token: room.players[playerIndex].token,
  };
}

function getRoomStatus(room) {
  if (!room.players[1]) {
    return 'waiting';
  }
  if (!room.state) {
    return 'ready';
  }
  return room.state.gameOver ? 'finished' : 'playing';
}

function touchRoom(room) {
  room.updatedAt = Date.now();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        const error = new Error('Requête trop volumineuse.');
        error.code = 'BODY_TOO_LARGE';
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Corps JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function normalizeRoomApiPath(requestUrl) {
  if (requestUrl.pathname === '/api/rooms' || requestUrl.pathname.startsWith('/api/rooms/')) {
    return requestUrl.pathname;
  }
  if (requestUrl.pathname !== '/api/rooms.php') {
    return null;
  }
  const roomId = requestUrl.searchParams.get('room');
  if (!roomId) {
    return '/api/rooms';
  }
  const action = requestUrl.searchParams.get('action');
  return `/api/rooms/${roomId}${action === 'join' ? '/join' : ''}`;
}
