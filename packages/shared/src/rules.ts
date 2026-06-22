import {
  type GameState,
  type Player,
  type Tile,
  type PropertyTile,
  type TransportTile,
  type UtilityTile,
  type OwnableTile,
  type Card,
  type Currency,
  type GameLogEntry,
  RuleError,
  RULE_ERRORS,
  isOwnable,
} from './types.js';
import {
  BOARD_SIZE,
  GO_BONUS,
  JAIL_TILE_ID,
  JAIL_FINE,
  MAX_JAIL_TURNS,
  UTILITY_MULTIPLIERS,
} from './constants.js';
import { GROUP_SIZES } from './board.js';

// ── tiny helpers ───────────────────────────────────────────────────────────
export type RNG = () => number; // returns [0,1)

export function tileAt(state: GameState, id: number): Tile {
  return state.tiles[id];
}
export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}
export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

let logCounter = 0;
export function pushLog(state: GameState, kind: GameLogEntry['kind'], text: string): void {
  state.log.push({ id: ++logCounter, ts: Date.now(), text, kind });
  if (state.log.length > 200) state.log.shift();
}

export function rollDie(rng: RNG = Math.random): number {
  return 1 + Math.floor(rng() * 6);
}
export function rollDice(rng: RNG = Math.random): [number, number] {
  return [rollDie(rng), rollDie(rng)];
}

// ── ownership helpers ──────────────────────────────────────────────────────
export function groupTiles(state: GameState, groupId: string): OwnableTile[] {
  return state.tiles.filter(
    (t): t is OwnableTile => isOwnable(t) && (t as OwnableTile).groupId === groupId,
  );
}
export function ownsWholeGroup(state: GameState, playerId: string, groupId: string): boolean {
  const size = GROUP_SIZES[groupId];
  if (!size) return false;
  const owned = groupTiles(state, groupId).filter((t) => t.ownerId === playerId);
  return owned.length === size;
}
export function transportsOwnedBy(state: GameState, ownerId: string): number {
  return state.tiles.filter((t) => t.type === 'TRANSPORT' && t.ownerId === ownerId).length;
}
export function utilitiesOwnedBy(state: GameState, ownerId: string): number {
  return state.tiles.filter((t) => t.type === 'UTILITY' && t.ownerId === ownerId).length;
}

// ── rent ─────────────────────────────────────────────────────────────────
export function calcRent(
  state: GameState,
  tile: OwnableTile,
  diceTotal: number,
  opts: { transportMultiplier?: number; utilityForce10x?: boolean } = {},
): Currency {
  if (!tile.ownerId || tile.mortgaged) return 0;

  if (tile.type === 'PROPERTY') {
    const p = tile as PropertyTile;
    if (p.hotel) return p.rent[5];
    if (p.houses > 0) return p.rent[p.houses];
    // unimproved: doubled if owner has the full color group
    const base = p.rent[0];
    return ownsWholeGroup(state, p.ownerId!, p.groupId) ? base * 2 : base;
  }

  if (tile.type === 'TRANSPORT') {
    const t = tile as TransportTile;
    const count = transportsOwnedBy(state, t.ownerId!);
    const rent = t.baseRent * Math.pow(2, Math.max(0, count - 1)); // 25/50/100/200
    return rent * (opts.transportMultiplier ?? 1);
  }

  // UTILITY
  const u = tile as UtilityTile;
  const count = utilitiesOwnedBy(state, u.ownerId!);
  const mult = opts.utilityForce10x ? UTILITY_MULTIPLIERS[1] : UTILITY_MULTIPLIERS[count === 2 ? 1 : 0];
  return mult * diceTotal;
}

// ── money ────────────────────────────────────────────────────────────────
export function credit(state: GameState, playerId: string, amount: Currency): void {
  const p = playerById(state, playerId);
  if (p) p.balance += amount;
}

/**
 * Charge `debtorId` `amount`, paid to `creditorId` (null = bank).
 * Returns true if settled immediately; false if the debtor can't afford it
 * (a pendingDebt is recorded and they must liquidate or go bankrupt).
 */
export function charge(
  state: GameState,
  debtorId: string,
  amount: Currency,
  creditorId: string | null,
  reason: string,
): boolean {
  const debtor = playerById(state, debtorId);
  if (!debtor || amount <= 0) return true;

  if (debtor.balance >= amount) {
    debtor.balance -= amount;
    if (creditorId) {
      credit(state, creditorId, amount);
    } else if (state.houseRules.freeParkingJackpot && (reason === 'tax' || reason === 'fine')) {
      state.freeParkingPot += amount;
    }
    return true;
  }

  state.pendingDebt = { debtorId, creditorId, amount, reason };
  return false;
}

// ── movement ───────────────────────────────────────────────────────────────
export function setPosition(state: GameState, player: Player, tileId: number, passedGo: boolean): void {
  player.position = tileId;
  if (passedGo) {
    credit(state, player.id, GO_BONUS);
    pushLog(state, 'money', `${player.name} passed GO and collected ${GO_BONUS}.`);
    // house rule: landing exactly on GO pays the bonus a second time
    if (state.houseRules.doubleGoOnLanding && tileId === 0) {
      credit(state, player.id, GO_BONUS);
      pushLog(state, 'money', `${player.name} landed right on GO — bonus doubled!`);
    }
  }
}

/** Advance forward (or backward for negative) by `steps`, awarding GO when passing it. */
export function advance(state: GameState, player: Player, steps: number): void {
  const raw = player.position + steps;
  const passedGo = steps > 0 && raw >= BOARD_SIZE;
  const next = ((raw % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  setPosition(state, player, next, passedGo);
}

/** Move directly to a tile id; optionally collect GO if we wrap forward past it. */
export function moveToTile(state: GameState, player: Player, tileId: number, collectGo: boolean): void {
  const passedGo = collectGo && tileId < player.position;
  setPosition(state, player, tileId, passedGo);
}

export function sendToJail(state: GameState, player: Player): void {
  player.position = JAIL_TILE_ID;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  pushLog(state, 'move', `${player.name} was sent to the Holding Cell.`);
}

// ── landing resolution ─────────────────────────────────────────────────────
export type LandingOutcome =
  | { type: 'NOTHING' }
  | { type: 'BUY_OPTION'; tileId: number }
  | { type: 'PAID_RENT'; toId: string; amount: Currency; settled: boolean }
  | { type: 'CARD'; deck: 'FORTUNE' | 'CIVIC' }
  | { type: 'TAX'; amount: Currency; settled: boolean }
  | { type: 'GOTO_JAIL' }
  | { type: 'FREE_PARKING'; amount: Currency };

export function resolveLanding(
  state: GameState,
  diceTotal: number,
  opts: { transportMultiplier?: number; utilityForce10x?: boolean } = {},
): LandingOutcome {
  const player = currentPlayer(state);
  const tile = tileAt(state, player.position);

  switch (tile.type) {
    case 'GO':
    case 'JAIL':
      return { type: 'NOTHING' };

    case 'FREE_PARKING': {
      let amount = 0;
      if (state.houseRules.freeParkingJackpot && state.freeParkingPot > 0) {
        amount = state.freeParkingPot;
        credit(state, player.id, amount);
        state.freeParkingPot = 0;
        pushLog(state, 'money', `${player.name} scooped the Free Parking pot: ${amount}.`);
      }
      return { type: 'FREE_PARKING', amount };
    }

    case 'GOTO_JAIL':
      sendToJail(state, player);
      return { type: 'GOTO_JAIL' };

    case 'TAX': {
      const settled = charge(state, player.id, tile.amount, null, 'tax');
      if (settled) pushLog(state, 'money', `${player.name} paid ${tile.amount} in ${tile.name}.`);
      return { type: 'TAX', amount: tile.amount, settled };
    }

    case 'FORTUNE':
      return { type: 'CARD', deck: 'FORTUNE' };
    case 'CIVIC':
      return { type: 'CARD', deck: 'CIVIC' };

    case 'PROPERTY':
    case 'TRANSPORT':
    case 'UTILITY': {
      const ot = tile as OwnableTile;
      if (ot.ownerId === null) {
        return { type: 'BUY_OPTION', tileId: ot.id };
      }
      if (ot.ownerId === player.id || ot.mortgaged) {
        return { type: 'NOTHING' };
      }
      const owner = playerById(state, ot.ownerId)!;
      const rent = calcRent(state, ot, diceTotal, opts);
      if (rent <= 0) return { type: 'NOTHING' };
      const settled = charge(state, player.id, rent, owner.id, 'rent');
      if (settled) pushLog(state, 'money', `${player.name} paid ${rent} rent to ${owner.name} for ${ot.name}.`);
      return { type: 'PAID_RENT', toId: owner.id, amount: rent, settled };
    }
  }
}

// ── nearest tile (for cards) ─────────────────────────────────────────────────
export function nearestTileOfType(state: GameState, from: number, type: 'TRANSPORT' | 'UTILITY'): number {
  for (let i = 1; i <= BOARD_SIZE; i++) {
    const id = (from + i) % BOARD_SIZE;
    if (state.tiles[id].type === type) return id;
  }
  return from;
}

// ── cards ─────────────────────────────────────────────────────────────────
/**
 * Apply a drawn card. Returns whether the player should re-resolve their new
 * landing tile (movement cards) and any rent multiplier overrides for it.
 */
export function applyCard(
  state: GameState,
  card: Card,
  _diceTotal: number,
): { landAgain: boolean; transportMultiplier?: number; utilityForce10x?: boolean } {
  const player = currentPlayer(state);
  state.lastCard = { deck: card.deck, text: card.text };
  pushLog(state, 'card', `${player.name} drew ${card.deck === 'FORTUNE' ? 'a Fortune' : 'a Civic'} card: ${card.text}`);
  const e = card.effect;

  switch (e.kind) {
    case 'MONEY':
      if (e.amount >= 0) credit(state, player.id, e.amount);
      else charge(state, player.id, -e.amount, null, 'card');
      return { landAgain: false };

    case 'PAY_EACH': {
      for (const other of state.players) {
        if (other.id === player.id || other.bankrupt) continue;
        // best-effort transfer; if debtor can't cover all, the last charge
        // sets pendingDebt and the rest is handled on settle.
        charge(state, player.id, e.amount, other.id, 'card');
      }
      return { landAgain: false };
    }

    case 'COLLECT_EACH': {
      for (const other of state.players) {
        if (other.id === player.id || other.bankrupt) continue;
        charge(state, other.id, e.amount, player.id, 'card');
      }
      return { landAgain: false };
    }

    case 'MOVE_TO':
      moveToTile(state, player, e.tileId, e.collectGo);
      return { landAgain: true };

    case 'MOVE_REL':
      advance(state, player, e.steps);
      return { landAgain: true };

    case 'GOTO_JAIL':
      sendToJail(state, player);
      return { landAgain: false };

    case 'GET_OUT_OF_JAIL':
      player.getOutOfJailCards += 1;
      return { landAgain: false };

    case 'REPAIRS': {
      let total = 0;
      for (const t of state.tiles) {
        if (t.type === 'PROPERTY' && t.ownerId === player.id) {
          total += t.hotel ? e.perHotel : t.houses * e.perHouse;
        }
      }
      if (total > 0) charge(state, player.id, total, null, 'card');
      return { landAgain: false };
    }

    case 'GO_TO_NEAREST': {
      const targetType = e.group === 'transport' ? 'TRANSPORT' : 'UTILITY';
      const id = nearestTileOfType(state, player.position, targetType);
      const passedGo = id < player.position;
      setPosition(state, player, id, passedGo);
      return e.group === 'transport'
        ? { landAgain: true, transportMultiplier: 2 }
        : { landAgain: true, utilityForce10x: true };
    }
  }
}

// ── buying ───────────────────────────────────────────────────────────────
export function buyTile(state: GameState, playerId: string, tileId: number, price?: Currency): void {
  const tile = tileAt(state, tileId);
  if (!isOwnable(tile)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Tile is not purchasable.');
  if (tile.ownerId !== null) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Tile already owned.');
  const player = playerById(state, playerId);
  if (!player) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No such player.');
  const cost = price ?? (tile as OwnableTile).price;
  if (player.balance < cost) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Not enough Bricks.');
  player.balance -= cost;
  tile.ownerId = playerId;
  player.ownedTileIds.push(tileId);
  pushLog(state, 'money', `${player.name} bought ${tile.name} for ${cost}.`);
}

// ── build / sell ───────────────────────────────────────────────────────────
function groupHouseSpread(state: GameState, groupId: string): { min: number; max: number } {
  const props = groupTiles(state, groupId).filter((t): t is PropertyTile => t.type === 'PROPERTY');
  let min = Infinity;
  let max = -Infinity;
  for (const p of props) {
    const lvl = p.hotel ? 5 : p.houses;
    min = Math.min(min, lvl);
    max = Math.max(max, lvl);
  }
  return { min, max };
}

export function canBuild(state: GameState, playerId: string, tileId: number): true {
  const tile = tileAt(state, tileId);
  if (tile.type !== 'PROPERTY') throw new RuleError(RULE_ERRORS.ILLEGAL, 'Only districts can be built on.');
  const p = tile as PropertyTile;
  if (p.ownerId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'You do not own this district.');
  if (!ownsWholeGroup(state, playerId, p.groupId)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'You need the whole color group.');
  // no mortgaged tile in the group
  if (groupTiles(state, p.groupId).some((t) => (t as PropertyTile).mortgaged))
    throw new RuleError(RULE_ERRORS.ILLEGAL, 'A district in this group is mortgaged.');
  if (p.hotel) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Already has a hotel.');
  // even building: current level must be the group minimum
  const lvl = p.houses;
  const { min } = groupHouseSpread(state, p.groupId);
  if (lvl !== min) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Build evenly across the group first.');
  // supply check
  if (state.houseRules.buildingShortage) {
    if (p.houses < 4 && state.housesRemaining <= 0) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No houses left in supply.');
    if (p.houses === 4 && state.hotelsRemaining <= 0) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No hotels left in supply.');
  }
  const player = playerById(state, playerId)!;
  if (player.balance < p.houseCost) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Not enough Bricks to build.');
  return true;
}

export function build(state: GameState, playerId: string, tileId: number): void {
  canBuild(state, playerId, tileId);
  const p = tileAt(state, tileId) as PropertyTile;
  const player = playerById(state, playerId)!;
  player.balance -= p.houseCost;
  if (p.houses < 4) {
    p.houses += 1;
    if (state.houseRules.buildingShortage) state.housesRemaining -= 1;
    pushLog(state, 'system', `${player.name} built a house on ${p.name} (now ${p.houses}).`);
  } else {
    p.houses = 0;
    p.hotel = true;
    if (state.houseRules.buildingShortage) {
      state.housesRemaining += 4; // 4 houses returned to supply
      state.hotelsRemaining -= 1;
    }
    pushLog(state, 'system', `${player.name} built a hotel on ${p.name}.`);
  }
}

export function sellBuilding(state: GameState, playerId: string, tileId: number): void {
  const tile = tileAt(state, tileId);
  if (tile.type !== 'PROPERTY') throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not a district.');
  const p = tile as PropertyTile;
  if (p.ownerId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not your district.');
  if (!p.hotel && p.houses === 0) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Nothing to sell.');
  // even selling: must sell from the group maximum
  const lvl = p.hotel ? 5 : p.houses;
  const { max } = groupHouseSpread(state, p.groupId);
  if (lvl !== max) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Sell evenly across the group first.');
  const player = playerById(state, playerId)!;
  const refund = Math.floor(p.houseCost / 2);
  if (p.hotel) {
    p.hotel = false;
    p.houses = 4;
    if (state.houseRules.buildingShortage) {
      state.hotelsRemaining += 1;
      state.housesRemaining -= 4; // hotel becomes 4 houses again
    }
  } else {
    p.houses -= 1;
    if (state.houseRules.buildingShortage) state.housesRemaining += 1;
  }
  player.balance += refund;
  pushLog(state, 'money', `${player.name} sold a building on ${p.name} for ${refund}.`);
}

// ── mortgage ────────────────────────────────────────────────────────────────
export function mortgage(state: GameState, playerId: string, tileId: number): void {
  const tile = tileAt(state, tileId);
  if (!isOwnable(tile)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Cannot mortgage this tile.');
  const ot = tile as OwnableTile;
  if (ot.ownerId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not your property.');
  if (ot.mortgaged) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Already mortgaged.');
  if (ot.type === 'PROPERTY' && (ot.houses > 0 || ot.hotel))
    throw new RuleError(RULE_ERRORS.ILLEGAL, 'Sell buildings before mortgaging.');
  ot.mortgaged = true;
  credit(state, playerId, ot.mortgageValue);
  pushLog(state, 'money', `${playerById(state, playerId)!.name} mortgaged ${ot.name} for ${ot.mortgageValue}.`);
}

export function unmortgage(state: GameState, playerId: string, tileId: number): void {
  const tile = tileAt(state, tileId);
  if (!isOwnable(tile)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Cannot unmortgage this tile.');
  const ot = tile as OwnableTile;
  if (ot.ownerId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not your property.');
  if (!ot.mortgaged) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not mortgaged.');
  const cost = Math.ceil(ot.mortgageValue * 1.1);
  const player = playerById(state, playerId)!;
  if (player.balance < cost) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Not enough to lift the mortgage.');
  player.balance -= cost;
  ot.mortgaged = false;
  pushLog(state, 'money', `${player.name} lifted the mortgage on ${ot.name} for ${cost}.`);
}

// ── jail ────────────────────────────────────────────────────────────────────
export function payJailFine(state: GameState, playerId: string): void {
  const player = playerById(state, playerId)!;
  if (!player.inJail) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not in the Holding Cell.');
  if (player.balance < JAIL_FINE) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Not enough for the fine.');
  charge(state, playerId, JAIL_FINE, null, 'fine');
  player.inJail = false;
  player.jailTurns = 0;
  pushLog(state, 'money', `${player.name} paid the ${JAIL_FINE} fine and left the Holding Cell.`);
}

export function useJailCard(state: GameState, playerId: string): void {
  const player = playerById(state, playerId)!;
  if (!player.inJail) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not in the Holding Cell.');
  if (player.getOutOfJailCards <= 0) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No Release Writ to use.');
  player.getOutOfJailCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  pushLog(state, 'system', `${player.name} used a Release Writ to leave the Holding Cell.`);
}

export { MAX_JAIL_TURNS, JAIL_FINE };

// ── net worth / bankruptcy / win ─────────────────────────────────────────────
export function netWorth(state: GameState, playerId: string): Currency {
  const player = playerById(state, playerId);
  if (!player) return 0;
  let worth = player.balance;
  for (const t of state.tiles) {
    if (!isOwnable(t)) continue;
    const ot = t as OwnableTile;
    if (ot.ownerId !== playerId) continue;
    worth += ot.mortgaged ? 0 : ot.mortgageValue; // raisable cash value
    if (ot.type === 'PROPERTY') {
      const buildings = ot.hotel ? 5 : ot.houses;
      worth += buildings * Math.floor(ot.houseCost / 2);
    }
  }
  return worth;
}

/** Total cash a player could raise right now by selling buildings + mortgaging. */
export function raisableCash(state: GameState, playerId: string): Currency {
  const player = playerById(state, playerId);
  if (!player) return 0;
  let cash = player.balance;
  for (const t of state.tiles) {
    if (!isOwnable(t) || (t as OwnableTile).ownerId !== playerId) continue;
    const ot = t as OwnableTile;
    if (ot.type === 'PROPERTY') {
      const buildings = ot.hotel ? 5 : ot.houses;
      cash += buildings * Math.floor(ot.houseCost / 2);
    }
    if (!ot.mortgaged) cash += ot.mortgageValue;
  }
  return cash;
}

/** Transfer everything `playerId` owns to a creditor (or back to the bank). */
export function bankrupt(state: GameState, playerId: string, explicitCreditorId?: string | null): void {
  const player = playerById(state, playerId)!;
  const debt = state.pendingDebt;
  const creditorId =
    explicitCreditorId !== undefined
      ? explicitCreditorId
      : debt && debt.debtorId === playerId
        ? debt.creditorId
        : null;
  const creditor = creditorId ? playerById(state, creditorId) : null;

  // cash + jail cards
  if (creditor) {
    creditor.balance += player.balance;
    creditor.getOutOfJailCards += player.getOutOfJailCards;
  }
  player.balance = 0;
  player.getOutOfJailCards = 0;

  // properties
  for (const t of state.tiles) {
    if (!isOwnable(t) || (t as OwnableTile).ownerId !== playerId) continue;
    const ot = t as OwnableTile;
    if (ot.type === 'PROPERTY') {
      // buildings are sold back to the bank at half cost; supply returns
      const buildings = ot.hotel ? 5 : ot.houses;
      if (state.houseRules.buildingShortage) {
        if (ot.hotel) state.hotelsRemaining += 1;
        state.housesRemaining += ot.hotel ? 0 : ot.houses;
      }
      if (creditor) creditor.balance += buildings * Math.floor(ot.houseCost / 2);
      ot.houses = 0;
      ot.hotel = false;
    }
    if (creditor) {
      ot.ownerId = creditor.id;
      creditor.ownedTileIds.push(ot.id);
      // creditor must pay 10% to unmortgage later; mortgaged status carries over
    } else {
      ot.ownerId = null;
      ot.mortgaged = false;
    }
  }

  player.ownedTileIds = [];
  player.bankrupt = true;
  player.inJail = false;
  if (state.pendingDebt?.debtorId === playerId) state.pendingDebt = null;
  pushLog(state, 'system', `${player.name} went bankrupt${creditor ? ` to ${creditor.name}` : ''}.`);
}

export function solventPlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

/** If only one player remains solvent, mark the game over. Returns winner id or null. */
export function checkWin(state: GameState): string | null {
  const alive = solventPlayers(state);
  if (state.players.length > 1 && alive.length === 1) {
    state.phase = 'GAME_OVER';
    state.winnerId = alive[0].id;
    pushLog(state, 'system', `${alive[0].name} wins BOOMTOWN! 🏆`);
    return alive[0].id;
  }
  return null;
}
