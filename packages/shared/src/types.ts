// ── BOOMTOWN shared types ───────────────────────────────────────────────
// The server is authoritative over everything in here. Clients render this
// state and send `ClientAction` intents; they never mutate it locally.

export type Currency = number; // integer "Bricks" (our currency)

export type TokenId =
  | 'crane'
  | 'hardhat'
  | 'wheelbarrow'
  | 'lantern'
  | 'compass'
  | 'anvil';

export interface Player {
  id: string;
  name: string;
  tokenId: TokenId;
  color: string;
  balance: Currency;
  position: number; // tile index 0..39
  inJail: boolean;
  jailTurns: number;
  ownedTileIds: number[];
  getOutOfJailCards: number;
  bankrupt: boolean;
  isConnected: boolean;
  isHost: boolean;
  ready: boolean;
}

export type TileType =
  | 'GO'
  | 'PROPERTY'
  | 'UTILITY'
  | 'TRANSPORT'
  | 'TAX'
  | 'FORTUNE' // card deck tile (our "Chance")
  | 'CIVIC' // card deck tile (our "Community Chest")
  | 'JAIL' // "Holding Cell" (just visiting / locked up)
  | 'GOTO_JAIL'
  | 'FREE_PARKING';

export interface BaseTile {
  id: number;
  type: TileType;
  name: string;
}

export interface PropertyTile extends BaseTile {
  type: 'PROPERTY';
  groupId: string; // color group
  price: Currency;
  rent: Currency[]; // [base, 1house, 2, 3, 4, hotel]
  houseCost: Currency;
  mortgageValue: Currency;
  ownerId: string | null;
  houses: number; // 0..4
  hotel: boolean;
  mortgaged: boolean;
}

export interface TransportTile extends BaseTile {
  type: 'TRANSPORT';
  groupId: 'transport';
  price: Currency;
  baseRent: Currency; // rent when owner holds 1; scales 1/2/4/8x
  mortgageValue: Currency;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface UtilityTile extends BaseTile {
  type: 'UTILITY';
  groupId: 'utility';
  price: Currency;
  mortgageValue: Currency;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface TaxTile extends BaseTile {
  type: 'TAX';
  amount: Currency;
}

export interface SimpleTile extends BaseTile {
  type: 'GO' | 'FORTUNE' | 'CIVIC' | 'JAIL' | 'GOTO_JAIL' | 'FREE_PARKING';
}

export type Tile =
  | PropertyTile
  | TransportTile
  | UtilityTile
  | TaxTile
  | SimpleTile;

export type OwnableTile = PropertyTile | TransportTile | UtilityTile;

export function isOwnable(t: Tile): t is OwnableTile {
  return t.type === 'PROPERTY' || t.type === 'TRANSPORT' || t.type === 'UTILITY';
}

// ── Cards ────────────────────────────────────────────────────────────────
export type CardDeck = 'FORTUNE' | 'CIVIC';

export type CardEffect =
  | { kind: 'MONEY'; amount: Currency } // +/- from bank
  | { kind: 'PAY_EACH'; amount: Currency } // pay each other player
  | { kind: 'COLLECT_EACH'; amount: Currency } // collect from each player
  | { kind: 'MOVE_TO'; tileId: number; collectGo: boolean }
  | { kind: 'MOVE_REL'; steps: number }
  | { kind: 'GOTO_JAIL' }
  | { kind: 'GET_OUT_OF_JAIL' }
  | { kind: 'REPAIRS'; perHouse: Currency; perHotel: Currency }
  | { kind: 'GO_TO_NEAREST'; group: 'transport' | 'utility' };

export interface Card {
  id: string;
  deck: CardDeck;
  text: string;
  effect: CardEffect;
}

// ── House rules ────────────────────────────────────────────────────────────
export interface HouseRules {
  freeParkingJackpot: boolean; // taxes + fines pile up on Free Parking
  auctionsEnabled: boolean; // declined property goes to auction
  doubleGoOnLanding: boolean; // landing exactly on GO pays double
  buildingShortage: boolean; // limited house/hotel supply
  startingBalance: Currency;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  freeParkingJackpot: false,
  auctionsEnabled: true,
  doubleGoOnLanding: false,
  buildingShortage: true,
  startingBalance: 1500,
};

// ── Auctions & trades ────────────────────────────────────────────────────
export interface AuctionState {
  tileId: number;
  highBid: Currency;
  highBidderId: string | null;
  // players still allowed to bid (not folded, not bankrupt)
  activePlayerIds: string[];
  endsAt: number; // epoch ms; extended on each bid
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  // what `from` gives:
  offerTileIds: number[];
  offerCash: Currency;
  offerJailCards: number;
  // what `from` requests from `to`:
  requestTileIds: number[];
  requestCash: Currency;
  requestJailCards: number;
}

// ── Game state ────────────────────────────────────────────────────────────
export type GamePhase =
  | 'LOBBY'
  | 'ROLLING' // current player must roll (or handle jail)
  | 'ACTION' // landed; resolve buy/auction/etc, then end turn
  | 'AUCTION'
  | 'GAME_OVER';

export interface GameLogEntry {
  id: number;
  ts: number;
  text: string;
  kind: 'money' | 'move' | 'system' | 'trade' | 'card';
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  tiles: Tile[];
  currentPlayerIndex: number;
  lastDice: [number, number] | null;
  doublesCount: number;
  houseRules: HouseRules;
  log: GameLogEntry[];
  freeParkingPot: Currency;
  housesRemaining: number;
  hotelsRemaining: number;
  auction: AuctionState | null;
  pendingTrade: TradeOffer | null;
  // transient: set after a roll when current player may buy the tile they're on
  pendingPurchaseTileId: number | null;
  // most recent card drawn, for UI display
  lastCard: { deck: CardDeck; text: string } | null;
  // when the current player can't cover a charge, they must liquidate or fold
  pendingDebt: {
    debtorId: string;
    creditorId: string | null; // null = the bank
    amount: Currency;
    reason: string;
  } | null;
  winnerId: string | null;
  turnCount: number;
}

// ── Client → server action intents ─────────────────────────────────────────
export type ClientAction =
  | { type: 'ROLL' }
  | { type: 'BUY' }
  | { type: 'DECLINE_BUY' } // buy declined → auction (if enabled)
  | { type: 'BUILD'; tileId: number }
  | { type: 'SELL_BUILDING'; tileId: number }
  | { type: 'MORTGAGE'; tileId: number }
  | { type: 'UNMORTGAGE'; tileId: number }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'ROLL_FOR_JAIL' }
  | { type: 'BID'; amount: Currency }
  | { type: 'FOLD_AUCTION' }
  | { type: 'PROPOSE_TRADE'; offer: Omit<TradeOffer, 'id'> }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'PAY_DEBT' }
  | { type: 'END_TURN' };

// ── Lobby / socket protocol ────────────────────────────────────────────────
export interface PublicRoomInfo {
  roomCode: string;
  playerCount: number;
  phase: GamePhase;
}

// server → client events
export interface ServerToClient {
  state: (state: GameState) => void;
  joined: (payload: { playerId: string; sessionToken: string; roomCode: string }) => void;
  error: (payload: { code: string; message: string }) => void;
  dice: (payload: { dice: [number, number]; playerId: string }) => void;
}

// client → server events
export interface ClientToServer {
  createRoom: (
    payload: { name: string; tokenId: TokenId },
    cb: (res: { ok: true; roomCode: string; playerId: string; sessionToken: string } | { ok: false; message: string }) => void,
  ) => void;
  joinRoom: (
    payload: { roomCode: string; name: string; tokenId: TokenId; sessionToken?: string },
    cb: (res: { ok: true; roomCode: string; playerId: string; sessionToken: string } | { ok: false; message: string }) => void,
  ) => void;
  setReady: (payload: { ready: boolean }) => void;
  setTouch: (payload: { tokenId?: TokenId; color?: string }) => void;
  updateHouseRules: (payload: Partial<HouseRules>) => void;
  startGame: () => void;
  action: (payload: ClientAction) => void;
  leave: () => void;
}

export const RULE_ERRORS = {
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  WRONG_PHASE: 'WRONG_PHASE',
  ILLEGAL: 'ILLEGAL',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
} as const;

export class RuleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RuleError';
  }
}
