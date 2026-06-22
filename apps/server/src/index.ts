import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server, type Socket } from 'socket.io';
import {
  type ClientAction,
  type HouseRules,
  type TokenId,
  RuleError,
} from '@boomtown/shared';
import { Game } from './Game.js';
import { makeRoomCode, makeSessionToken } from './util.js';

const PORT = Number(process.env.PORT ?? 2567);

interface RoomEntry {
  game: Game;
  /** sessionToken → playerId, for reconnection into the same seat */
  tokens: Map<string, string>;
  /** playerId → current socket id (if connected) */
  sockets: Map<string, string>;
  emptySince: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomEntry>();

// reap rooms that have been empty for a while
const EMPTY_TTL_MS = 5 * 60 * 1000;
const TURN_TIMEOUT_MS = 45 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > EMPTY_TTL_MS) {
      room.game.dispose();
      if (room.turnTimer) clearTimeout(room.turnTimer);
      rooms.delete(code);
    }
  }
}, 60_000);

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function broadcast(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('state', room.game.state);
  scheduleTurnTimeout(code);
}

/** If the current player is disconnected, auto-advance their turn after a grace period. */
function scheduleTurnTimeout(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  const st = room.game.state;
  if (st.phase !== 'ROLLING' && st.phase !== 'ACTION') return;
  const cur = st.players[st.currentPlayerIndex];
  if (!cur || cur.isConnected) return;
  room.turnTimer = setTimeout(() => {
    const r = rooms.get(code);
    if (!r) return;
    const s = r.game.state;
    const c = s.players[s.currentPlayerIndex];
    if (c && !c.isConnected && (s.phase === 'ROLLING' || s.phase === 'ACTION')) {
      // skip the absent player's turn safely
      s.pendingPurchaseTileId = null;
      s.pendingTrade = null;
      if (!s.pendingDebt && !s.auction) {
        r.game.advanceToNextPlayer();
        broadcast(code);
      }
    }
  }, TURN_TIMEOUT_MS);
}

function attachGameHandlers(code: string): void {
  const room = rooms.get(code)!;
  room.game.onChange = () => broadcast(code);
  room.game.onDice = (dice, playerId) => io.to(code).emit('dice', { dice, playerId });
}

io.on('connection', (socket: Socket) => {
  const send = (state = true) => {
    const code = socket.data.code as string | undefined;
    if (code) broadcast(code);
    void state;
  };

  socket.on('createRoom', (payload: { name: string; tokenId: TokenId }, cb) => {
    try {
      const code = makeRoomCode(new Set(rooms.keys()));
      const game = new Game(code);
      const room: RoomEntry = { game, tokens: new Map(), sockets: new Map(), emptySince: null, turnTimer: null };
      rooms.set(code, room);
      attachGameHandlers(code);
      const player = game.addPlayer(payload.name, payload.tokenId);
      const token = makeSessionToken();
      room.tokens.set(token, player.id);
      room.sockets.set(player.id, socket.id);
      socket.data.code = code;
      socket.data.playerId = player.id;
      socket.join(code);
      cb?.({ ok: true, roomCode: code, playerId: player.id, sessionToken: token });
      broadcast(code);
    } catch (e) {
      cb?.({ ok: false, message: e instanceof Error ? e.message : 'Could not create room.' });
    }
  });

  socket.on(
    'joinRoom',
    (payload: { roomCode: string; name: string; tokenId: TokenId; sessionToken?: string }, cb) => {
      try {
        const code = (payload.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) return cb?.({ ok: false, message: 'No room with that code.' });

        // reconnect path
        if (payload.sessionToken && room.tokens.has(payload.sessionToken)) {
          const playerId = room.tokens.get(payload.sessionToken)!;
          room.game.markConnection(playerId, true);
          room.sockets.set(playerId, socket.id);
          room.emptySince = null;
          socket.data.code = code;
          socket.data.playerId = playerId;
          socket.join(code);
          cb?.({ ok: true, roomCode: code, playerId, sessionToken: payload.sessionToken });
          return broadcast(code);
        }

        const player = room.game.addPlayer(payload.name, payload.tokenId);
        const token = makeSessionToken();
        room.tokens.set(token, player.id);
        room.sockets.set(player.id, socket.id);
        room.emptySince = null;
        socket.data.code = code;
        socket.data.playerId = player.id;
        socket.join(code);
        cb?.({ ok: true, roomCode: code, playerId: player.id, sessionToken: token });
        broadcast(code);
      } catch (e) {
        cb?.({ ok: false, message: e instanceof Error ? e.message : 'Could not join room.' });
      }
    },
  );

  const withRoom = (fn: (room: RoomEntry, playerId: string) => void) => {
    const code = socket.data.code as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    const room = code ? rooms.get(code) : undefined;
    if (!room || !playerId) return;
    try {
      fn(room, playerId);
      broadcast(code!);
    } catch (e) {
      if (e instanceof RuleError) socket.emit('error', { code: e.code, message: e.message });
      else socket.emit('error', { code: 'ERROR', message: e instanceof Error ? e.message : 'Error' });
    }
  };

  socket.on('setReady', (payload: { ready: boolean }) => withRoom((room, pid) => room.game.setReady(pid, payload.ready)));
  socket.on('setTouch', (payload: { tokenId?: TokenId }) => withRoom((room, pid) => room.game.setToken(pid, payload.tokenId)));
  socket.on('updateHouseRules', (payload: Partial<HouseRules>) => withRoom((room, pid) => room.game.setHouseRules(pid, payload)));
  socket.on('startGame', () => withRoom((room, pid) => room.game.start(pid)));
  socket.on('action', (payload: ClientAction) =>
    withRoom((room, pid) => {
      // handleAction calls onChange (broadcast) itself; withRoom broadcasts again harmlessly
      room.game.handleAction(pid, payload);
    }),
  );

  socket.on('leave', () => handleDisconnect(socket));
  socket.on('disconnect', () => handleDisconnect(socket));

  void send;
});

function handleDisconnect(socket: Socket): void {
  const code = socket.data.code as string | undefined;
  const playerId = socket.data.playerId as string | undefined;
  if (!code || !playerId) return;
  const room = rooms.get(code);
  if (!room) return;
  // only mark disconnected if this socket is still the active one for the player
  if (room.sockets.get(playerId) === socket.id) {
    room.game.markConnection(playerId, false);
    room.sockets.delete(playerId);
  }
  if (room.game.isEmpty()) room.emptySince = Date.now();
  broadcast(code);
}

server.listen(PORT, () => {
  console.log(`◈ BOOMTOWN server listening on :${PORT}`);
});
