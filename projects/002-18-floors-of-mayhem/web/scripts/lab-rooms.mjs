import { WebSocketServer } from '../../vendor/upstream/node_modules/ws/wrapper.mjs';
import { Room, randomCode } from '../../vendor/upstream/shared/room.js';
export function shouldPause(run, roomCode) { return !!(run && !run.stopped && run.observationMode === 'step' && run.roomCode === roomCode && run.busy.size); }
export function labRooms(server, getRun) {
  const rooms = new Map(), wss = new WebSocketServer({ server, maxPayload: 2048 });
  function create() { let code; do { code = randomCode(); } while (rooms.has(code)); const room = new Room(code); room.createdAt = Date.now(); rooms.set(code, room); const run = getRun(); if (run) run.roomCode = code; return code; }
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://127.0.0.1:3183');
    if (url.pathname !== '/ws' || req.headers.host !== '127.0.0.1:3183' || req.headers.origin && req.headers.origin !== 'http://127.0.0.1:3183') return ws.close(1008, 'Local lab only');
    const room = rooms.get(String(url.searchParams.get('room') || '').toUpperCase());
    if (!room) return ws.close(1000, 'Unknown room');
    ws.on('message', raw => room.handle(ws, String(raw))); ws.on('close', () => room.interrupted(ws)); ws.on('error', () => {}); room.attach(ws);
  });
  const timer = setInterval(() => {
    for (const [code, room] of rooms) {
      const paused = shouldPause(getRun(), code);
      if (paused !== room.labPaused) { room.labPaused = paused; room.broadcast({ type: 'lab-pause', paused }); }
      if (paused) continue; // Freeze the authoritative world for ALL seats, including CPU.
      if (!room.advance() && (room.everJoined || Date.now() - room.createdAt > 60000)) rooms.delete(code);
    }
  }, 1000 / 60);
  return { create, count: () => rooms.size, close: () => { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); wss.close(); } };
}
