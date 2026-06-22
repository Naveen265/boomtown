import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, createPlayer } from './state.js';
import { createBoard } from './board.js';
import {
  calcRent,
  charge,
  advance,
  buyTile,
  build,
  sellBuilding,
  mortgage,
  unmortgage,
  sendToJail,
  payJailFine,
  useJailCard,
  bankrupt,
  checkWin,
  resolveLanding,
  applyCard,
  netWorth,
  raisableCash,
  ownsWholeGroup,
} from './rules.js';
import { FORTUNE_CARDS } from './cards.js';
import type { GameState, PropertyTile, TransportTile, UtilityTile } from './types.js';
import { GO_BONUS, JAIL_FINE } from './constants.js';

function makeGame(playerCount = 2, startingBalance = 1500): GameState {
  const s = createInitialState('TEST5', { ...createInitialState('x').houseRules, startingBalance });
  for (let i = 0; i < playerCount; i++) {
    s.players.push(createPlayer(`p${i}`, `Player${i}`, (['crane', 'hardhat', 'wheelbarrow', 'lantern', 'compass', 'anvil'] as const)[i], i === 0, startingBalance));
  }
  s.phase = 'ROLLING';
  return s;
}

const prop = (s: GameState, id: number) => s.tiles[id] as PropertyTile;

describe('board', () => {
  it('has 40 tiles with one GO, one Jail, one Goto-jail, 4 transports, 2 utilities', () => {
    const tiles = createBoard();
    expect(tiles).toHaveLength(40);
    expect(tiles.filter((t) => t.type === 'GO')).toHaveLength(1);
    expect(tiles.filter((t) => t.type === 'TRANSPORT')).toHaveLength(4);
    expect(tiles.filter((t) => t.type === 'UTILITY')).toHaveLength(2);
    expect(tiles.filter((t) => t.type === 'PROPERTY')).toHaveLength(22);
    expect(tiles[0].type).toBe('GO');
    expect(tiles[10].type).toBe('JAIL');
    expect(tiles[30].type).toBe('GOTO_JAIL');
  });
});

describe('rent', () => {
  let s: GameState;
  beforeEach(() => {
    s = makeGame();
  });

  it('charges base rent on a single owned district', () => {
    buyTile(s, 'p0', 1); // Mudflat Lane, rent base 2
    expect(calcRent(s, prop(s, 1), 7)).toBe(2);
  });

  it('doubles base rent when the owner has the full color group', () => {
    buyTile(s, 'p0', 1);
    buyTile(s, 'p0', 3); // both Tannery Row tiles
    expect(ownsWholeGroup(s, 'p0', 'tannery')).toBe(true);
    expect(calcRent(s, prop(s, 1), 7)).toBe(4); // 2 * 2
  });

  it('uses the house/hotel rent table', () => {
    buyTile(s, 'p0', 1);
    buyTile(s, 'p0', 3);
    build(s, 'p0', 1); // 1 house
    expect(prop(s, 1).houses).toBe(1);
    expect(calcRent(s, prop(s, 1), 7)).toBe(10); // rent[1]
  });

  it('returns 0 rent when mortgaged', () => {
    buyTile(s, 'p0', 1);
    mortgage(s, 'p0', 1);
    expect(calcRent(s, prop(s, 1), 7)).toBe(0);
  });

  it('scales transport rent by number owned', () => {
    buyTile(s, 'p0', 5);
    const depot = s.tiles[5] as TransportTile;
    expect(calcRent(s, depot, 0)).toBe(25);
    buyTile(s, 'p0', 15);
    expect(calcRent(s, depot, 0)).toBe(50);
    buyTile(s, 'p0', 25);
    expect(calcRent(s, depot, 0)).toBe(100);
    buyTile(s, 'p0', 35);
    expect(calcRent(s, depot, 0)).toBe(200);
  });

  it('utility rent = dice × multiplier (4× one, 10× both)', () => {
    buyTile(s, 'p0', 12);
    const u = s.tiles[12] as UtilityTile;
    expect(calcRent(s, u, 8)).toBe(32); // 4 * 8
    buyTile(s, 'p0', 28);
    expect(calcRent(s, u, 8)).toBe(80); // 10 * 8
  });
});

describe('movement & GO', () => {
  it('awards GO bonus when passing it', () => {
    const s = makeGame();
    s.players[0].position = 38;
    advance(s, s.players[0], 4); // 38 -> 2, passes GO
    expect(s.players[0].position).toBe(2);
    expect(s.players[0].balance).toBe(1500 + GO_BONUS);
  });

  it('doubles the GO bonus when landing exactly on GO (house rule)', () => {
    const s = makeGame();
    s.houseRules.doubleGoOnLanding = true;
    s.players[0].position = 36;
    advance(s, s.players[0], 4); // 36 -> 0, lands on GO
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].balance).toBe(1500 + GO_BONUS * 2);
  });

  it('does not award GO on a backward move', () => {
    const s = makeGame();
    s.players[0].position = 2;
    advance(s, s.players[0], -3); // -> 39
    expect(s.players[0].position).toBe(39);
    expect(s.players[0].balance).toBe(1500);
  });
});

describe('charge / debt', () => {
  it('settles instantly when affordable', () => {
    const s = makeGame();
    const ok = charge(s, 'p0', 200, 'p1', 'rent');
    expect(ok).toBe(true);
    expect(s.players[0].balance).toBe(1300);
    expect(s.players[1].balance).toBe(1700);
    expect(s.pendingDebt).toBeNull();
  });

  it('records a pending debt when unaffordable', () => {
    const s = makeGame();
    s.players[0].balance = 50;
    const ok = charge(s, 'p0', 200, 'p1', 'rent');
    expect(ok).toBe(false);
    expect(s.pendingDebt).toMatchObject({ debtorId: 'p0', creditorId: 'p1', amount: 200 });
    expect(s.players[0].balance).toBe(50); // not yet deducted
  });
});

describe('build rules', () => {
  let s: GameState;
  beforeEach(() => {
    s = makeGame();
    buyTile(s, 'p0', 1);
    buyTile(s, 'p0', 3);
  });

  it('requires the full group', () => {
    const s2 = makeGame();
    buyTile(s2, 'p0', 1);
    expect(() => build(s2, 'p0', 1)).toThrow();
  });

  it('enforces even building', () => {
    build(s, 'p0', 1); // ok, both at 0 -> build on 1
    expect(() => build(s, 'p0', 1)).toThrow(); // 1 now ahead of 3
    build(s, 'p0', 3); // evens out
    expect(prop(s, 3).houses).toBe(1);
  });

  it('builds a hotel after 4 houses and returns houses to supply', () => {
    s.houseRules.buildingShortage = true;
    for (let i = 0; i < 4; i++) {
      build(s, 'p0', 1);
      build(s, 'p0', 3);
    }
    expect(prop(s, 1).houses).toBe(4);
    const before = s.housesRemaining;
    build(s, 'p0', 1); // hotel
    expect(prop(s, 1).hotel).toBe(true);
    expect(prop(s, 1).houses).toBe(0);
    expect(s.housesRemaining).toBe(before + 4);
  });

  it('refunds half on sale', () => {
    build(s, 'p0', 1);
    build(s, 'p0', 3);
    const bal = s.players[0].balance;
    sellBuilding(s, 'p0', 1); // tannery houseCost 50 -> refund 25
    expect(s.players[0].balance).toBe(bal + 25);
    expect(prop(s, 1).houses).toBe(0);
  });
});

describe('mortgage', () => {
  it('pays mortgage value and charges value+10% to lift', () => {
    const s = makeGame();
    buyTile(s, 'p0', 1); // price 60, mortgage 30
    const afterBuy = s.players[0].balance;
    mortgage(s, 'p0', 1);
    expect(prop(s, 1).mortgaged).toBe(true);
    expect(s.players[0].balance).toBe(afterBuy + 30);
    const afterMortgage = s.players[0].balance;
    unmortgage(s, 'p0', 1); // ceil(30 * 1.1) = 33
    expect(prop(s, 1).mortgaged).toBe(false);
    expect(s.players[0].balance).toBe(afterMortgage - 33);
  });

  it('blocks mortgaging a built district', () => {
    const s = makeGame();
    buyTile(s, 'p0', 1);
    buyTile(s, 'p0', 3);
    build(s, 'p0', 1);
    build(s, 'p0', 3);
    expect(() => mortgage(s, 'p0', 1)).toThrow();
  });
});

describe('jail', () => {
  it('sends a player to jail and resets doubles', () => {
    const s = makeGame();
    s.doublesCount = 2;
    sendToJail(s, s.players[0]);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.doublesCount).toBe(0);
  });

  it('leaves jail by paying the fine', () => {
    const s = makeGame();
    sendToJail(s, s.players[0]);
    const bal = s.players[0].balance;
    payJailFine(s, 'p0');
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].balance).toBe(bal - JAIL_FINE);
  });

  it('leaves jail using a Release Writ', () => {
    const s = makeGame();
    sendToJail(s, s.players[0]);
    s.players[0].getOutOfJailCards = 1;
    useJailCard(s, 'p0');
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].getOutOfJailCards).toBe(0);
  });
});

describe('auction (settlement via priced purchase)', () => {
  it('awards the tile to the winner at the bid price', () => {
    const s = makeGame();
    buyTile(s, 'p1', 19, 120); // won an auction for 120 (list 200)
    expect((s.tiles[19] as PropertyTile).ownerId).toBe('p1');
    expect(s.players[1].balance).toBe(1500 - 120);
  });

  it('rejects a bid above the bidder’s balance', () => {
    const s = makeGame();
    s.players[1].balance = 50;
    expect(() => buyTile(s, 'p1', 19, 120)).toThrow();
  });
});

describe('bankruptcy & win', () => {
  it('transfers all assets to the creditor and ends the game with one survivor', () => {
    const s = makeGame(2);
    buyTile(s, 'p0', 1);
    buyTile(s, 'p0', 3);
    s.players[0].balance = 10;
    // p0 owes p1 500 they can't pay
    charge(s, 'p0', 500, 'p1', 'rent');
    expect(s.pendingDebt).not.toBeNull();
    bankrupt(s, 'p0');
    expect(s.players[0].bankrupt).toBe(true);
    expect((s.tiles[1] as PropertyTile).ownerId).toBe('p1');
    expect(s.players[1].ownedTileIds).toContain(1);
    expect(s.players[1].balance).toBe(1500 + 10); // got p0's cash
    const winner = checkWin(s);
    expect(winner).toBe('p1');
    expect(s.phase).toBe('GAME_OVER');
  });

  it('returns assets to the bank when bankrupt to the bank (tax)', () => {
    const s = makeGame(2);
    buyTile(s, 'p0', 1);
    s.players[0].balance = 10;
    charge(s, 'p0', 500, null, 'tax');
    bankrupt(s, 'p0');
    expect((s.tiles[1] as PropertyTile).ownerId).toBeNull();
  });
});

describe('net worth & raisable cash', () => {
  it('counts cash + mortgage value + half building cost', () => {
    const s = makeGame();
    buyTile(s, 'p0', 1); // price 60, mortgage 30
    buyTile(s, 'p0', 3);
    build(s, 'p0', 1); // +1 house, cost 50, sale value 25
    build(s, 'p0', 3);
    const cash = s.players[0].balance;
    expect(raisableCash(s, 'p0')).toBe(cash + 30 + 30 + 25 + 25);
    expect(netWorth(s, 'p0')).toBe(cash + 30 + 30 + 25 + 25);
  });
});

describe('landing & cards', () => {
  it('offers a buy option on an unowned tile', () => {
    const s = makeGame();
    s.players[0].position = 1;
    const outcome = resolveLanding(s, 5);
    expect(outcome).toEqual({ type: 'BUY_OPTION', tileId: 1 });
  });

  it('charges rent on landing on an owned tile', () => {
    const s = makeGame();
    buyTile(s, 'p1', 1);
    s.players[0].position = 1;
    const outcome = resolveLanding(s, 5);
    expect(outcome.type).toBe('PAID_RENT');
    expect(s.players[1].balance).toBe(1500 - 60 + 2); // p1 spent 60, got 2 rent
  });

  it('applies a money card', () => {
    const s = makeGame();
    const card = FORTUNE_CARDS.find((c) => c.id === 'F02')!; // collect 150
    applyCard(s, card, 5);
    expect(s.players[0].balance).toBe(1650);
  });

  it('sends to jail via a card', () => {
    const s = makeGame();
    const card = FORTUNE_CARDS.find((c) => c.id === 'F03')!;
    const r = applyCard(s, card, 5);
    expect(r.landAgain).toBe(false);
    expect(s.players[0].inJail).toBe(true);
  });

  it('grants a Release Writ via a card', () => {
    const s = makeGame();
    const card = FORTUNE_CARDS.find((c) => c.id === 'F07')!;
    applyCard(s, card, 5);
    expect(s.players[0].getOutOfJailCards).toBe(1);
  });
});
