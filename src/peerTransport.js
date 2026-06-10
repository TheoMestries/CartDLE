const CHUNK_SIZE = 3000;
const MAX_CHUNKS = 100;

export function createPeerPackets(message, packetId = createPacketId()) {
  const serialized = JSON.stringify(message);
  const total = Math.max(1, Math.ceil(serialized.length / CHUNK_SIZE));
  if (total > MAX_CHUNKS) {
    throw new Error('Message PvP trop volumineux.');
  }
  return Array.from({ length: total }, (_, index) => ({
    type: 'peer-packet',
    packetId,
    index,
    total,
    data: serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  }));
}

export function acceptPeerPacket(packetStore, packet) {
  if (!isValidPeerPacket(packet)) {
    throw new Error('Paquet PvP invalide.');
  }
  if (packetStore.size >= 40 && !packetStore.has(packet.packetId)) {
    packetStore.clear();
  }

  let pending = packetStore.get(packet.packetId);
  if (pending?.completed) {
    return null;
  }
  if (!pending) {
    pending = {
      chunks: Array(packet.total),
      received: 0,
      total: packet.total,
    };
    packetStore.set(packet.packetId, pending);
  }
  if (pending.total !== packet.total) {
    packetStore.delete(packet.packetId);
    throw new Error('Paquet PvP incohérent.');
  }
  if (pending.chunks[packet.index] === undefined) {
    pending.chunks[packet.index] = packet.data;
    pending.received += 1;
  }
  if (pending.received !== pending.total) {
    return null;
  }

  try {
    const message = JSON.parse(pending.chunks.join(''));
    packetStore.set(packet.packetId, { completed: true, total: packet.total });
    return message;
  } catch {
    packetStore.delete(packet.packetId);
    throw new Error('Message PvP illisible.');
  }
}

function isValidPeerPacket(packet) {
  return Boolean(
    packet
      && packet.type === 'peer-packet'
      && typeof packet.packetId === 'string'
      && packet.packetId.length <= 80
      && Number.isInteger(packet.index)
      && Number.isInteger(packet.total)
      && packet.total > 0
      && packet.total <= MAX_CHUNKS
      && packet.index >= 0
      && packet.index < packet.total
      && typeof packet.data === 'string'
      && packet.data.length <= CHUNK_SIZE,
  );
}

function createPacketId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
