import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type { GameState, ClientAction, HouseRules, TokenId, TradeOffer } from '@boomtown/shared';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  `${window.location.protocol}//${window.location.hostname}:2567`;

const SS_KEY = 'boomtown.session';

interface SavedSession {
  roomCode: string;
  sessionToken: string;
  name: string;
  tokenId: TokenId;
}

function saveSession(s: SavedSession) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    sessionStorage.removeItem(SS_KEY);
  } catch {
    /* ignore */
  }
}

interface Store {
  connected: boolean;
  joined: boolean;
  selfId: string | null;
  roomCode: string | null;
  state: GameState | null;
  error: { code: string; message: string } | null;
  dice: { dice: [number, number]; playerId: string; nonce: number } | null;
  joining: boolean;

  createRoom: (name: string, tokenId: TokenId) => Promise<string | null>;
  joinRoom: (roomCode: string, name: string, tokenId: TokenId) => Promise<boolean>;
  setReady: (ready: boolean) => void;
  setToken: (tokenId: TokenId) => void;
  updateHouseRules: (rules: Partial<HouseRules>) => void;
  startGame: () => void;
  send: (action: ClientAction) => void;
  proposeTrade: (offer: Omit<TradeOffer, 'id'>) => void;
  leave: () => void;
  dismissError: () => void;
}

let socket: Socket;

export const useGame = create<Store>((set, get) => {
  socket = io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    set({ connected: true });
    // attempt reconnect into a saved seat
    const saved = loadSession();
    if (saved && !get().joined) {
      socket.emit(
        'joinRoom',
        { ...saved },
        (res: { ok: boolean; roomCode?: string; playerId?: string; sessionToken?: string; message?: string }) => {
          if (res.ok && res.playerId && res.roomCode) {
            set({ joined: true, selfId: res.playerId, roomCode: res.roomCode });
          } else {
            clearSession();
          }
        },
      );
    }
  });
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('state', (state: GameState) => set({ state }));
  socket.on('error', (error: { code: string; message: string }) => {
    set({ error });
    setTimeout(() => {
      if (get().error === error) set({ error: null });
    }, 3500);
  });
  socket.on('dice', (payload: { dice: [number, number]; playerId: string }) => {
    set((s) => ({ dice: { ...payload, nonce: (s.dice?.nonce ?? 0) + 1 } }));
  });

  return {
    connected: false,
    joined: false,
    selfId: null,
    roomCode: null,
    state: null,
    error: null,
    dice: null,
    joining: false,

    createRoom: (name, tokenId) =>
      new Promise((resolve) => {
        set({ joining: true });
        socket.emit('createRoom', { name, tokenId }, (res: any) => {
          set({ joining: false });
          if (res.ok) {
            set({ joined: true, selfId: res.playerId, roomCode: res.roomCode });
            saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, name, tokenId });
            resolve(res.roomCode);
          } else {
            set({ error: { code: 'JOIN', message: res.message } });
            resolve(null);
          }
        });
      }),

    joinRoom: (roomCode, name, tokenId) =>
      new Promise((resolve) => {
        set({ joining: true });
        socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), name, tokenId }, (res: any) => {
          set({ joining: false });
          if (res.ok) {
            set({ joined: true, selfId: res.playerId, roomCode: res.roomCode });
            saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, name, tokenId });
            resolve(true);
          } else {
            set({ error: { code: 'JOIN', message: res.message } });
            resolve(false);
          }
        });
      }),

    setReady: (ready) => socket.emit('setReady', { ready }),
    setToken: (tokenId) => socket.emit('setTouch', { tokenId }),
    updateHouseRules: (rules) => socket.emit('updateHouseRules', rules),
    startGame: () => socket.emit('startGame'),
    send: (action) => socket.emit('action', action),
    proposeTrade: (offer) => socket.emit('action', { type: 'PROPOSE_TRADE', offer }),
    leave: () => {
      socket.emit('leave');
      clearSession();
      set({ joined: false, selfId: null, roomCode: null, state: null });
    },
    dismissError: () => set({ error: null }),
  };
});

export function selfPlayer(s: Store) {
  return s.state?.players.find((p) => p.id === s.selfId) ?? null;
}
