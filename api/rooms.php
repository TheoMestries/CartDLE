<?php

declare(strict_types=1);

const ROOM_TTL = 21600;
const MAX_BODY_SIZE = 2097152;
const ALLOWED_TRAITS = ['assault', 'bulwark', 'arcanist', 'support', 'marksman', 'survivor', 'tactician'];

final class ApiException extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    cleanupRooms();
    handleRequest();
} catch (ApiException $error) {
    sendJson($error->status, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log((string) $error);
    sendJson(500, ['error' => 'Erreur interne du serveur.']);
}

function handleRequest(): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $roomId = normalizeRoomId($_GET['room'] ?? null);
    $action = $_GET['action'] ?? null;

    if ($method === 'POST' && $roomId === null && $action === null) {
        $body = readJsonBody();
        $room = createRoom($body['name'] ?? null);
        sendJson(201, createRoomResponse($room, 0));
    }

    if ($roomId === null) {
        throw new ApiException(404, 'Salon introuvable.');
    }

    if ($method === 'POST' && $action === 'join') {
        $body = readJsonBody();
        $result = updateRoom($roomId, function (array &$room) use ($body): array {
            if ($room['players'][1] !== null) {
                throw new ApiException(409, 'Ce salon est déjà complet.');
            }
            $room['players'][1] = createRoomPlayer($body['name'] ?? null, 1);
            touchRoom($room);
            return createRoomResponse($room, 1);
        });
        sendJson(200, $result);
    }

    $token = $_SERVER['HTTP_X_PLAYER_TOKEN'] ?? '';
    $result = updateRoom($roomId, function (array &$room) use ($method, $token, $action): array {
        $playerIndex = authenticateRoomPlayer($room, $token);
        if ($playerIndex === null) {
            throw new ApiException(401, 'Jeton de joueur invalide.');
        }

        if ($method === 'GET') {
            touchRoom($room);
            return createRoomResponse($room, $playerIndex);
        }

        if ($method !== 'PUT' && !($method === 'POST' && $action === 'sync')) {
            throw new ApiException(405, 'Méthode non autorisée.');
        }

        $body = readJsonBody();
        if (!isset($body['baseVersion']) || !is_int($body['baseVersion']) || $body['baseVersion'] !== $room['version']) {
            throw new ApiException(409, 'La partie a évolué.');
        }
        if (!isValidOnlineState($body['state'] ?? null)) {
            throw new ApiException(400, 'État de partie invalide.');
        }
        if (!canPublishState($room, $playerIndex)) {
            throw new ApiException(403, 'Ce n’est pas à vous de jouer.');
        }

        $body['state']['players'][0]['name'] = $room['players'][0]['name'];
        $body['state']['players'][1]['name'] = $room['players'][1]['name'];
        $room['state'] = $body['state'];
        $room['version']++;
        touchRoom($room);
        return createRoomResponse($room, $playerIndex);
    });
    sendJson(200, $result);
}

function createRoom(mixed $name): array
{
    $storage = getStorageDirectory();
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $roomId = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $path = roomPath($roomId);
        $handle = @fopen($path, 'x+b');
        if ($handle === false) {
            continue;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new ApiException(500, 'Impossible de verrouiller le salon.');
            }
            $room = [
                'id' => $roomId,
                'players' => [createRoomPlayer($name, 0), null],
                'state' => null,
                'version' => 0,
                'updatedAt' => time(),
            ];
            writeRoomToHandle($handle, $room);
            flock($handle, LOCK_UN);
            return $room;
        } finally {
            fclose($handle);
        }
    }
    throw new ApiException(500, 'Impossible de créer un salon.');
}

function updateRoom(string $roomId, callable $callback): array
{
    $path = roomPath($roomId);
    $handle = @fopen($path, 'r+b');
    if ($handle === false) {
        throw new ApiException(404, 'Ce salon n’existe plus.');
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            throw new ApiException(500, 'Impossible de verrouiller le salon.');
        }
        $room = readRoomFromHandle($handle);
        if (($room['updatedAt'] ?? 0) < time() - ROOM_TTL) {
            flock($handle, LOCK_UN);
            fclose($handle);
            @unlink($path);
            throw new ApiException(404, 'Ce salon n’existe plus.');
        }
        $result = $callback($room);
        writeRoomToHandle($handle, $room);
        flock($handle, LOCK_UN);
        return $result;
    } finally {
        if (is_resource($handle)) {
            fclose($handle);
        }
    }
}

function createRoomPlayer(mixed $name, int $index): array
{
    return [
        'name' => sanitizePlayerName($name, 'Joueur ' . ($index + 1)),
        'token' => base64UrlEncode(random_bytes(24)),
    ];
}

function sanitizePlayerName(mixed $name, string $fallback): string
{
    $cleanName = trim((string) ($name ?? ''));
    $cleanName = preg_replace('/\s+/u', ' ', $cleanName) ?? '';
    $cleanName = function_exists('mb_substr') ? mb_substr($cleanName, 0, 24) : substr($cleanName, 0, 24);
    return $cleanName !== '' ? $cleanName : $fallback;
}

function authenticateRoomPlayer(array $room, string $token): ?int
{
    foreach ($room['players'] as $index => $player) {
        if ($player !== null && hash_equals($player['token'], $token)) {
            return $index;
        }
    }
    return null;
}

function canPublishState(array $room, int $playerIndex): bool
{
    if ($room['players'][1] === null) {
        return false;
    }
    if ($room['state'] === null || ($room['state']['gameOver'] ?? false) === true) {
        return $playerIndex === 0;
    }
    return ($room['state']['activePlayer'] ?? null) === $playerIndex;
}

function isValidOnlineState(mixed $state): bool
{
    return is_array($state)
        && ($state['mode'] ?? null) === 'online'
        && isset($state['players']) && is_array($state['players']) && count($state['players']) === 2
        && isValidOnlinePlayer($state['players'][0]) && isValidOnlinePlayer($state['players'][1])
        && in_array($state['activePlayer'] ?? null, [0, 1], true)
        && in_array($state['startingPlayer'] ?? null, [0, 1], true)
        && isset($state['turn']) && is_int($state['turn']) && $state['turn'] > 0
        && isset($state['gameOver']) && is_bool($state['gameOver'])
        && isset($state['featuredCollections']) && isStringArray($state['featuredCollections'])
        && isset($state['log']) && isStringArray($state['log'])
        && isset($state['stats']) && is_array($state['stats'])
        && isFiniteNumber($state['stats']['cardsPlayed'] ?? null)
        && isFiniteNumber($state['stats']['maxDamage'] ?? null);
}

function isValidOnlinePlayer(mixed $player): bool
{
    return is_array($player)
        && is_string($player['name'] ?? null)
        && isFiniteNumber($player['health'] ?? null)
        && isFiniteNumber($player['maxHealth'] ?? null)
        && isFiniteNumber($player['energy'] ?? null)
        && isFiniteNumber($player['maxEnergy'] ?? null)
        && isFiniteNumber($player['openingEnergyBonus'] ?? null)
        && isFiniteNumber($player['fatigue'] ?? null)
        && is_bool($player['overdriveUsed'] ?? null)
        && is_bool($player['setupComplete'] ?? null)
        && isset($player['hand']) && is_array($player['hand']) && array_every($player['hand'], 'isValidOnlineCard')
        && isset($player['deck']) && is_array($player['deck']) && array_every($player['deck'], 'isValidOnlineCard')
        && isset($player['board']) && is_array($player['board']) && count($player['board']) === 5
        && array_every($player['board'], fn (mixed $card): bool => $card === null || isValidOnlineCard($card));
}

function isValidOnlineCard(mixed $card): bool
{
    return is_array($card)
        && is_string($card['sourceId'] ?? null)
        && is_string($card['uid'] ?? null)
        && is_string($card['name'] ?? null)
        && is_string($card['description'] ?? null)
        && is_string($card['imagePath'] ?? null)
        && is_string($card['collectionName'] ?? null)
        && is_string($card['rarity'] ?? null)
        && is_string($card['rarityLabel'] ?? null)
        && is_string($card['type'] ?? null)
        && isset($card['traits']) && is_array($card['traits']) && count($card['traits']) === 2
        && array_every($card['traits'], fn (mixed $trait): bool => is_string($trait) && in_array($trait, ALLOWED_TRAITS, true))
        && isFiniteNumber($card['cost'] ?? null)
        && isFiniteNumber($card['baseAttack'] ?? null)
        && isFiniteNumber($card['baseHealth'] ?? null)
        && isFiniteNumber($card['health'] ?? null)
        && isFiniteNumber($card['maxHealth'] ?? null)
        && isFiniteNumber($card['healthBonus'] ?? null)
        && (!isset($card['legendaryEffect']) || $card['legendaryEffect'] === null || isValidLegendaryEffect($card['legendaryEffect']));
}

function isValidLegendaryEffect(mixed $effect): bool
{
    return is_array($effect)
        && is_string($effect['id'] ?? null)
        && is_string($effect['name'] ?? null)
        && is_string($effect['description'] ?? null);
}

function createRoomResponse(array $room, int $playerIndex): array
{
    return [
        'roomId' => $room['id'],
        'playerIndex' => $playerIndex,
        'players' => array_map(fn (?array $player): ?string => $player['name'] ?? null, $room['players']),
        'status' => getRoomStatus($room),
        'version' => $room['version'],
        'state' => $room['state'],
        'token' => $room['players'][$playerIndex]['token'],
    ];
}

function getRoomStatus(array $room): string
{
    if ($room['players'][1] === null) {
        return 'waiting';
    }
    if ($room['state'] === null) {
        return 'ready';
    }
    return ($room['state']['gameOver'] ?? false) ? 'finished' : 'playing';
}

function touchRoom(array &$room): void
{
    $room['updatedAt'] = time();
}

function readJsonBody(): array
{
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > MAX_BODY_SIZE) {
        throw new ApiException(413, 'Requête trop volumineuse.');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > MAX_BODY_SIZE) {
        throw new ApiException(413, 'Requête trop volumineuse.');
    }
    if ($raw === '') {
        return [];
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        throw new ApiException(400, 'Corps JSON invalide.');
    }
    return $body;
}

function getStorageDirectory(): string
{
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'cartdle-pvp-' . substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new ApiException(500, 'Le stockage des salons est indisponible.');
    }
    return $directory;
}

function roomPath(string $roomId): string
{
    return getStorageDirectory() . DIRECTORY_SEPARATOR . $roomId . '.json';
}

function normalizeRoomId(mixed $roomId): ?string
{
    if (!is_string($roomId) || !preg_match('/^[A-Z0-9]{6}$/i', $roomId)) {
        return null;
    }
    return strtoupper($roomId);
}

function readRoomFromHandle($handle): array
{
    rewind($handle);
    $room = json_decode(stream_get_contents($handle) ?: '', true);
    if (!is_array($room)) {
        throw new ApiException(500, 'Le salon est corrompu.');
    }
    return $room;
}

function writeRoomToHandle($handle, array $room): void
{
    $encoded = json_encode($room, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, $encoded);
    fflush($handle);
}

function cleanupRooms(): void
{
    if (random_int(1, 20) !== 1) {
        return;
    }
    $expiration = time() - ROOM_TTL;
    foreach (glob(getStorageDirectory() . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        if ((filemtime($path) ?: 0) < $expiration) {
            @unlink($path);
        }
    }
}

function isStringArray(mixed $value): bool
{
    return is_array($value) && array_every($value, 'is_string');
}

function array_every(array $values, callable $predicate): bool
{
    foreach ($values as $value) {
        if (!$predicate($value)) {
            return false;
        }
    }
    return true;
}

function isFiniteNumber(mixed $value): bool
{
    return (is_int($value) || is_float($value)) && is_finite((float) $value);
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function sendJson(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
