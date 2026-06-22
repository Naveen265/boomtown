import {
  CURRENCY_SYMBOL,
  type Tile,
  type GameState,
  type Player,
  type OwnableTile,
  GROUP_COLORS,
  GROUP_ORDER,
  isOwnable,
  ownsWholeGroup,
} from '@boomtown/shared';

export function money(n: number): string {
  return `${CURRENCY_SYMBOL}${n.toLocaleString()}`;
}

export const groupColor = (groupId: string): string => GROUP_COLORS[groupId] ?? '#6b7280';

export function ownerOf(state: GameState, tile: Tile): Player | null {
  if (tile.type !== 'PROPERTY' && tile.type !== 'TRANSPORT' && tile.type !== 'UTILITY') return null;
  const ownerId = (tile as any).ownerId as string | null;
  return ownerId ? (state.players.find((p) => p.id === ownerId) ?? null) : null;
}

// ── board geometry: tile centers as % of a square board ────────────────────
export interface Cell {
  row: number; // 0..10 (0 = top)
  col: number; // 0..10 (0 = left)
  edge: 'bottom' | 'left' | 'top' | 'right' | 'corner';
}

export function tileCell(id: number): Cell {
  if (id === 0) return { row: 10, col: 10, edge: 'corner' };
  if (id === 10) return { row: 10, col: 0, edge: 'corner' };
  if (id === 20) return { row: 0, col: 0, edge: 'corner' };
  if (id === 30) return { row: 0, col: 10, edge: 'corner' };
  if (id < 10) return { row: 10, col: 10 - id, edge: 'bottom' };
  if (id < 20) return { row: 20 - id, col: 0, edge: 'left' };
  if (id < 30) return { row: 0, col: id - 20, edge: 'top' };
  return { row: id - 30, col: 10, edge: 'right' };
}

/** center of a tile as fractions [0..1] of board width/height */
export function tileCenter(id: number): { x: number; y: number } {
  const { row, col } = tileCell(id);
  return { x: (col + 0.5) / 11, y: (row + 0.5) / 11 };
}

/** how many properties + complete color groups a player holds (for player cards) */
export function holdings(state: GameState, playerId: string): { properties: number; monopolies: number } {
  let properties = 0;
  for (const t of state.tiles) {
    if (isOwnable(t) && (t as OwnableTile).ownerId === playerId) properties++;
  }
  let monopolies = 0;
  for (const g of GROUP_ORDER) if (ownsWholeGroup(state, playerId, g)) monopolies++;
  return { properties, monopolies };
}

/** small fan-out offset so multiple tokens on one tile don't fully overlap */
export function tokenOffset(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };
  const perRow = 3;
  const c = index % perRow;
  const r = Math.floor(index / perRow);
  return { dx: (c - 1) * 18, dy: (r - 0.5) * 16 };
}
