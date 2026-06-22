import {
  type GameState,
  type Player,
  type HouseRules,
  type TokenId,
  DEFAULT_HOUSE_RULES,
} from './types.js';
import { createBoard } from './board.js';
import { HOUSE_SUPPLY, HOTEL_SUPPLY } from './constants.js';

export const TOKEN_COLORS: Record<TokenId, string> = {
  crane: '#E8543F',
  hardhat: '#F2B33D',
  wheelbarrow: '#3DA35D',
  lantern: '#3D8BF2',
  compass: '#9B5DE5',
  anvil: '#16A3A3',
};

export const TOKEN_LABELS: Record<TokenId, string> = {
  crane: 'Crane',
  hardhat: 'Hard Hat',
  wheelbarrow: 'Wheelbarrow',
  lantern: 'Lantern',
  compass: 'Compass',
  anvil: 'Anvil',
};

export const ALL_TOKENS: TokenId[] = [
  'crane',
  'hardhat',
  'wheelbarrow',
  'lantern',
  'compass',
  'anvil',
];

export function createPlayer(
  id: string,
  name: string,
  tokenId: TokenId,
  isHost: boolean,
  startingBalance: number,
): Player {
  return {
    id,
    name,
    tokenId,
    color: TOKEN_COLORS[tokenId],
    balance: startingBalance,
    position: 0,
    inJail: false,
    jailTurns: 0,
    ownedTileIds: [],
    getOutOfJailCards: 0,
    bankrupt: false,
    isConnected: true,
    isHost,
    ready: false,
  };
}

export function createInitialState(roomCode: string, houseRules: HouseRules = DEFAULT_HOUSE_RULES): GameState {
  return {
    roomCode,
    phase: 'LOBBY',
    players: [],
    tiles: createBoard(),
    currentPlayerIndex: 0,
    lastDice: null,
    doublesCount: 0,
    houseRules: { ...houseRules },
    log: [],
    freeParkingPot: 0,
    housesRemaining: HOUSE_SUPPLY,
    hotelsRemaining: HOTEL_SUPPLY,
    auction: null,
    pendingTrade: null,
    pendingPurchaseTileId: null,
    lastCard: null,
    pendingDebt: null,
    winnerId: null,
    turnCount: 0,
  };
}
