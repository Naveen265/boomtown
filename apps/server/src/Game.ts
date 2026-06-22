import {
  type GameState,
  type Player,
  type TokenId,
  type HouseRules,
  type ClientAction,
  type Card,
  type CardDeck,
  type TradeOffer,
  type OwnableTile,
  type PropertyTile,
  RuleError,
  RULE_ERRORS,
  isOwnable,
  createInitialState,
  createPlayer,
  buildDecks,
  rollDice,
  pushLog,
  currentPlayer,
  advance,
  resolveLanding,
  applyCard,
  buyTile,
  build,
  sellBuilding,
  mortgage,
  unmortgage,
  payJailFine,
  useJailCard,
  charge,
  credit,
  bankrupt,
  checkWin,
  solventPlayers,
  groupTiles,
  ALL_TOKENS,
  TOKEN_COLORS,
  MAX_DOUBLES,
  MAX_JAIL_TURNS,
  JAIL_FINE,
  AUCTION_DURATION_MS,
  AUCTION_EXTEND_MS,
  AUCTION_MIN_INCREMENT,
} from '@boomtown/shared';
import { makeId, shuffle } from './util.js';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export class Game {
  state: GameState;
  private decks: { FORTUNE: Card[]; CIVIC: Card[] };
  private auctionTimer: ReturnType<typeof setTimeout> | null = null;
  /** whether the current player earned another roll (rolled doubles, not jailed) */
  private extraRoll = false;
  /** movement deferred until a jail-exit fine debt is settled */
  private deferredMove: number | null = null;

  onChange: () => void = () => {};
  onDice: (dice: [number, number], playerId: string) => void = () => {};

  constructor(roomCode: string) {
    this.state = createInitialState(roomCode);
    const decks = buildDecks();
    this.decks = { FORTUNE: shuffle(decks.FORTUNE), CIVIC: shuffle(decks.CIVIC) };
  }

  // ── lobby management ─────────────────────────────────────────────────────
  addPlayer(name: string, tokenId: TokenId): Player {
    if (this.state.phase !== 'LOBBY') throw new RuleError(RULE_ERRORS.ILLEGAL, 'Game already started.');
    if (this.state.players.length >= MAX_PLAYERS) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Room is full.');
    const token = this.freeToken(tokenId);
    const isHost = this.state.players.length === 0;
    const player = createPlayer(makeId(), name.slice(0, 16) || 'Player', token, isHost, this.state.houseRules.startingBalance);
    this.state.players.push(player);
    pushLog(this.state, 'system', `${player.name} joined the room.`);
    return player;
  }

  private freeToken(preferred: TokenId): TokenId {
    const taken = new Set(this.state.players.map((p) => p.tokenId));
    if (!taken.has(preferred)) return preferred;
    const open = ALL_TOKENS.find((t) => !taken.has(t));
    if (!open) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No tokens left.');
    return open;
  }

  setReady(playerId: string, ready: boolean): void {
    const p = this.player(playerId);
    p.ready = ready;
  }

  setToken(playerId: string, tokenId?: TokenId): void {
    if (this.state.phase !== 'LOBBY') return;
    const p = this.player(playerId);
    if (tokenId && tokenId !== p.tokenId) {
      if (this.state.players.some((o) => o.tokenId === tokenId)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Token taken.');
      p.tokenId = tokenId;
      p.color = TOKEN_COLORS[tokenId];
    }
  }

  setHouseRules(playerId: string, rules: Partial<HouseRules>): void {
    const p = this.player(playerId);
    if (!p.isHost) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Only the host can change house rules.');
    if (this.state.phase !== 'LOBBY') throw new RuleError(RULE_ERRORS.WRONG_PHASE, 'Game already started.');
    Object.assign(this.state.houseRules, rules);
    if (rules.startingBalance !== undefined) {
      for (const pl of this.state.players) pl.balance = rules.startingBalance;
    }
  }

  start(playerId: string): void {
    const host = this.player(playerId);
    if (!host.isHost) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Only the host can start.');
    if (this.state.players.length < MIN_PLAYERS) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Need at least 2 players.');
    this.state.players = shuffle(this.state.players);
    this.state.currentPlayerIndex = 0;
    this.state.phase = 'ROLLING';
    this.state.turnCount = 1;
    pushLog(this.state, 'system', `The boom begins! It's ${currentPlayer(this.state).name}'s turn.`);
  }

  markConnection(playerId: string, connected: boolean): void {
    const p = this.state.players.find((x) => x.id === playerId);
    if (p) p.isConnected = connected;
  }

  isEmpty(): boolean {
    return this.state.players.length === 0 || this.state.players.every((p) => !p.isConnected);
  }

  // ── action dispatch ──────────────────────────────────────────────────────
  handleAction(playerId: string, action: ClientAction): void {
    if (this.state.phase === 'GAME_OVER') throw new RuleError(RULE_ERRORS.WRONG_PHASE, 'The game is over.');

    switch (action.type) {
      case 'ROLL':
      case 'ROLL_FOR_JAIL':
        this.handleRoll(playerId);
        break;
      case 'BUY':
        this.handleBuy(playerId);
        break;
      case 'DECLINE_BUY':
        this.handleDecline(playerId);
        break;
      case 'BUILD':
        this.requireOwnTurnManage(playerId);
        build(this.state, playerId, action.tileId);
        break;
      case 'SELL_BUILDING':
        this.requireOwnTurnManage(playerId);
        sellBuilding(this.state, playerId, action.tileId);
        break;
      case 'MORTGAGE':
        this.requireOwnTurnManage(playerId);
        mortgage(this.state, playerId, action.tileId);
        break;
      case 'UNMORTGAGE':
        this.requireOwnTurnManage(playerId);
        unmortgage(this.state, playerId, action.tileId);
        break;
      case 'PAY_JAIL_FINE':
        this.handlePayJailFine(playerId);
        break;
      case 'USE_JAIL_CARD':
        this.requireCurrent(playerId);
        this.requirePhase('ROLLING');
        useJailCard(this.state, playerId);
        break;
      case 'BID':
        this.handleBid(playerId, action.amount);
        break;
      case 'FOLD_AUCTION':
        this.handleFold(playerId);
        break;
      case 'PROPOSE_TRADE':
        this.handlePropose(playerId, action.offer);
        break;
      case 'RESPOND_TRADE':
        this.handleRespondTrade(playerId, action.accept);
        break;
      case 'PAY_DEBT':
        this.handlePayDebt(playerId);
        break;
      case 'DECLARE_BANKRUPTCY':
        this.handleBankruptcy(playerId);
        break;
      case 'END_TURN':
        this.handleEndTurn(playerId);
        break;
      default:
        throw new RuleError(RULE_ERRORS.ILLEGAL, 'Unknown action.');
    }
    this.onChange();
  }

  // ── guards ───────────────────────────────────────────────────────────────
  private player(playerId: string): Player {
    const p = this.state.players.find((x) => x.id === playerId);
    if (!p) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No such player.');
    return p;
  }
  private requireCurrent(playerId: string): void {
    if (currentPlayer(this.state).id !== playerId) throw new RuleError(RULE_ERRORS.NOT_YOUR_TURN, 'Not your turn.');
  }
  private requirePhase(...phases: GameState['phase'][]): void {
    if (!phases.includes(this.state.phase)) throw new RuleError(RULE_ERRORS.WRONG_PHASE, `Cannot do that during ${this.state.phase}.`);
  }
  /** Management actions (build/mortgage) allowed on your turn outside auctions. */
  private requireOwnTurnManage(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ROLLING', 'ACTION');
  }

  // ── rolling & movement ───────────────────────────────────────────────────
  private handleRoll(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ROLLING');
    if (this.state.pendingDebt) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Settle your debt first.');
    const player = currentPlayer(this.state);
    const dice = rollDice();
    this.state.lastDice = dice;
    this.onDice(dice, player.id);
    const total = dice[0] + dice[1];
    const isDouble = dice[0] === dice[1];
    pushLog(this.state, 'move', `${player.name} rolled ${dice[0]} + ${dice[1]} = ${total}.`);

    if (player.inJail) {
      this.handleJailRoll(player, total, isDouble);
      return;
    }

    if (isDouble) {
      this.state.doublesCount += 1;
      if (this.state.doublesCount >= MAX_DOUBLES) {
        pushLog(this.state, 'move', `${player.name} rolled a third double in a row — straight to the Holding Cell.`);
        // sendToJail resets doublesCount and position
        player.position = 10;
        player.inJail = true;
        player.jailTurns = 0;
        this.state.doublesCount = 0;
        this.extraRoll = false;
        this.state.phase = 'ACTION';
        return;
      }
    } else {
      this.state.doublesCount = 0;
    }

    advance(this.state, player, total);
    this.extraRoll = isDouble;
    this.resolveLandingFull(total);
  }

  private handleJailRoll(player: Player, total: number, isDouble: boolean): void {
    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      pushLog(this.state, 'move', `${player.name} rolled doubles and walked free.`);
      advance(this.state, player, total);
      this.extraRoll = false; // doubles to escape jail do NOT grant another roll
      this.resolveLandingFull(total);
      return;
    }
    player.jailTurns += 1;
    if (player.jailTurns >= MAX_JAIL_TURNS) {
      pushLog(this.state, 'system', `${player.name} served their time and must pay the ${JAIL_FINE} fine.`);
      const settled = charge(this.state, player.id, JAIL_FINE, null, 'fine');
      player.inJail = false;
      player.jailTurns = 0;
      this.extraRoll = false;
      if (!settled) {
        // can't pay — defer the move until the debt clears
        this.deferredMove = total;
        this.state.phase = 'ACTION';
        return;
      }
      advance(this.state, player, total);
      this.resolveLandingFull(total);
    } else {
      pushLog(this.state, 'move', `${player.name} stays in the Holding Cell (turn ${player.jailTurns}/${MAX_JAIL_TURNS}).`);
      this.extraRoll = false;
      this.state.phase = 'ACTION';
    }
  }

  private resolveLandingFull(total: number, opts: { transportMultiplier?: number; utilityForce10x?: boolean } = {}): void {
    let outcome = resolveLanding(this.state, total, opts);

    // resolve any card-draw chains
    let guard = 0;
    while (outcome.type === 'CARD' && guard++ < 6) {
      const card = this.drawCard(outcome.deck);
      const r = applyCard(this.state, card, total);
      // a card may bankrupt another player (collect-from-each they can't pay)
      this.resolveForeignDebt();
      if (r.landAgain) {
        outcome = resolveLanding(this.state, total, {
          transportMultiplier: r.transportMultiplier,
          utilityForce10x: r.utilityForce10x,
        });
      } else {
        outcome = { type: 'NOTHING' };
      }
    }

    if (outcome.type === 'BUY_OPTION') {
      this.state.pendingPurchaseTileId = outcome.tileId;
    }
    if (currentPlayer(this.state).inJail) this.extraRoll = false;
    this.state.phase = 'ACTION';
  }

  private drawCard(deck: CardDeck): Card {
    const d = this.decks[deck];
    const card = d.shift()!;
    d.push(card); // cycle to the bottom
    return card;
  }

  /** If a non-current player owes money they can't pay (card effects), bankrupt them. */
  private resolveForeignDebt(): void {
    const d = this.state.pendingDebt;
    if (d && d.debtorId !== currentPlayer(this.state).id) {
      bankrupt(this.state, d.debtorId, d.creditorId);
      this.state.pendingDebt = null;
      checkWin(this.state);
    }
  }

  // ── buy / decline / auction ──────────────────────────────────────────────
  private handleBuy(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ACTION');
    if (this.state.pendingPurchaseTileId === null) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Nothing to buy.');
    buyTile(this.state, playerId, this.state.pendingPurchaseTileId);
    this.state.pendingPurchaseTileId = null;
  }

  private handleDecline(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ACTION');
    if (this.state.pendingPurchaseTileId === null) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Nothing to decline.');
    const tileId = this.state.pendingPurchaseTileId;
    this.state.pendingPurchaseTileId = null;
    if (this.state.houseRules.auctionsEnabled) {
      this.startAuction(tileId);
    } else {
      pushLog(this.state, 'system', `${this.player(playerId).name} passed on ${this.state.tiles[tileId].name}.`);
    }
  }

  private startAuction(tileId: number): void {
    const active = solventPlayers(this.state).map((p) => p.id);
    this.state.auction = {
      tileId,
      highBid: 0,
      highBidderId: null,
      activePlayerIds: active,
      endsAt: Date.now() + AUCTION_DURATION_MS,
    };
    this.state.phase = 'AUCTION';
    pushLog(this.state, 'system', `Auction! ${this.state.tiles[tileId].name} is up for bids.`);
    this.scheduleAuctionEnd();
  }

  private scheduleAuctionEnd(): void {
    if (this.auctionTimer) clearTimeout(this.auctionTimer);
    const a = this.state.auction;
    if (!a) return;
    const delay = Math.max(250, a.endsAt - Date.now());
    this.auctionTimer = setTimeout(() => {
      this.settleAuction();
      this.onChange();
    }, delay);
  }

  private handleBid(playerId: string, amount: number): void {
    this.requirePhase('AUCTION');
    const a = this.state.auction!;
    if (!a.activePlayerIds.includes(playerId)) throw new RuleError(RULE_ERRORS.ILLEGAL, 'You are not in this auction.');
    const player = this.player(playerId);
    const min = a.highBidderId ? a.highBid + AUCTION_MIN_INCREMENT : AUCTION_MIN_INCREMENT;
    if (!Number.isInteger(amount) || amount < min) throw new RuleError(RULE_ERRORS.ILLEGAL, `Bid must be at least ${min}.`);
    if (player.balance < amount) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'You cannot afford that bid.');
    a.highBid = amount;
    a.highBidderId = playerId;
    a.endsAt = Math.max(a.endsAt, Date.now() + AUCTION_EXTEND_MS);
    pushLog(this.state, 'system', `${player.name} bids ${amount}.`);
    this.scheduleAuctionEnd();
  }

  private handleFold(playerId: string): void {
    this.requirePhase('AUCTION');
    const a = this.state.auction!;
    a.activePlayerIds = a.activePlayerIds.filter((id) => id !== playerId);
    pushLog(this.state, 'system', `${this.player(playerId).name} drops out of the auction.`);
    if (a.activePlayerIds.length <= 1) this.settleAuction();
  }

  private settleAuction(): void {
    if (this.auctionTimer) {
      clearTimeout(this.auctionTimer);
      this.auctionTimer = null;
    }
    const a = this.state.auction;
    if (!a) return;
    this.state.auction = null;
    if (a.highBidderId) {
      buyTile(this.state, a.highBidderId, a.tileId, a.highBid);
    } else {
      pushLog(this.state, 'system', `No bids — ${this.state.tiles[a.tileId].name} stays on the market.`);
    }
    this.state.phase = 'ACTION';
  }

  // ── jail fine ────────────────────────────────────────────────────────────
  private handlePayJailFine(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ROLLING');
    payJailFine(this.state, playerId);
  }

  // ── debt / bankruptcy ──────────────────────────────────────────────────────
  private handlePayDebt(playerId: string): void {
    const d = this.state.pendingDebt;
    if (!d || d.debtorId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No debt to pay.');
    const player = this.player(playerId);
    if (player.balance < d.amount) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Raise more funds first.');
    player.balance -= d.amount;
    if (d.creditorId) credit(this.state, d.creditorId, d.amount);
    else if (this.state.houseRules.freeParkingJackpot && (d.reason === 'tax' || d.reason === 'fine')) this.state.freeParkingPot += d.amount;
    pushLog(this.state, 'money', `${player.name} settled a debt of ${d.amount}.`);
    this.state.pendingDebt = null;
    // resume a deferred jail-exit move
    if (this.deferredMove !== null) {
      const t = this.deferredMove;
      this.deferredMove = null;
      advance(this.state, player, t);
      this.resolveLandingFull(t);
    }
  }

  private handleBankruptcy(playerId: string): void {
    const isDebtor = this.state.pendingDebt?.debtorId === playerId;
    if (!isDebtor) this.requireCurrent(playerId);
    bankrupt(this.state, playerId, isDebtor ? undefined : null);
    this.deferredMove = null;
    this.state.pendingPurchaseTileId = null;
    if (checkWin(this.state)) return;
    // the bankrupt player was taking their turn → move to the next player
    if (currentPlayer(this.state).bankrupt) this.advanceToNextPlayer();
  }

  // ── trading ───────────────────────────────────────────────────────────────
  private handlePropose(playerId: string, offer: Omit<TradeOffer, 'id'>): void {
    this.requireCurrent(playerId);
    this.requirePhase('ROLLING', 'ACTION');
    if (offer.fromId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'You can only offer your own trade.');
    if (offer.toId === playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Pick another player.');
    const to = this.player(offer.toId);
    if (to.bankrupt) throw new RuleError(RULE_ERRORS.ILLEGAL, 'That player is out.');
    this.validateTradeSide(playerId, offer.offerTileIds, offer.offerCash, offer.offerJailCards);
    this.validateTradeSide(offer.toId, offer.requestTileIds, offer.requestCash, offer.requestJailCards);
    this.state.pendingTrade = { ...offer, id: makeId('t') };
    pushLog(this.state, 'trade', `${this.player(playerId).name} proposed a trade to ${to.name}.`);
  }

  private validateTradeSide(ownerId: string, tileIds: number[], cash: number, jailCards: number): void {
    if (cash < 0 || jailCards < 0) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Invalid trade values.');
    const owner = this.player(ownerId);
    if (owner.getOutOfJailCards < jailCards) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Not enough Release Writs.');
    for (const id of tileIds) {
      const t = this.state.tiles[id];
      if (!isOwnable(t) || (t as OwnableTile).ownerId !== ownerId)
        throw new RuleError(RULE_ERRORS.ILLEGAL, 'A traded property is not owned by the right player.');
      // can't trade a property whose color group still has buildings
      if (t.type === 'PROPERTY') {
        const grp = groupTiles(this.state, t.groupId).filter((g): g is PropertyTile => g.type === 'PROPERTY');
        if (grp.some((g) => g.houses > 0 || g.hotel))
          throw new RuleError(RULE_ERRORS.ILLEGAL, 'Sell buildings in that color group before trading.');
      }
    }
  }

  private handleRespondTrade(playerId: string, accept: boolean): void {
    const trade = this.state.pendingTrade;
    if (!trade) throw new RuleError(RULE_ERRORS.ILLEGAL, 'No trade to respond to.');
    if (trade.toId !== playerId) throw new RuleError(RULE_ERRORS.ILLEGAL, 'This trade is not addressed to you.');
    if (!accept) {
      this.state.pendingTrade = null;
      pushLog(this.state, 'trade', `${this.player(playerId).name} declined the trade.`);
      return;
    }
    // re-validate at execution time
    this.validateTradeSide(trade.fromId, trade.offerTileIds, trade.offerCash, trade.offerJailCards);
    this.validateTradeSide(trade.toId, trade.requestTileIds, trade.requestCash, trade.requestJailCards);
    const from = this.player(trade.fromId);
    const to = this.player(trade.toId);
    if (from.balance < trade.offerCash) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'Proposer cannot cover the cash.');
    if (to.balance < trade.requestCash) throw new RuleError(RULE_ERRORS.INSUFFICIENT_FUNDS, 'You cannot cover the cash.');

    this.transferAssets(from, to, trade.offerTileIds, trade.offerCash, trade.offerJailCards);
    this.transferAssets(to, from, trade.requestTileIds, trade.requestCash, trade.requestJailCards);
    this.state.pendingTrade = null;
    pushLog(this.state, 'trade', `${from.name} and ${to.name} completed a trade.`);
  }

  private transferAssets(from: Player, to: Player, tileIds: number[], cash: number, jailCards: number): void {
    from.balance -= cash;
    to.balance += cash;
    from.getOutOfJailCards -= jailCards;
    to.getOutOfJailCards += jailCards;
    for (const id of tileIds) {
      const t = this.state.tiles[id] as OwnableTile;
      t.ownerId = to.id;
      from.ownedTileIds = from.ownedTileIds.filter((x) => x !== id);
      if (!to.ownedTileIds.includes(id)) to.ownedTileIds.push(id);
    }
  }

  // ── end turn ─────────────────────────────────────────────────────────────
  private handleEndTurn(playerId: string): void {
    this.requireCurrent(playerId);
    this.requirePhase('ACTION');
    if (this.state.pendingPurchaseTileId !== null) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Resolve the property first.');
    if (this.state.pendingDebt) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Settle your debt first.');
    if (this.state.auction) throw new RuleError(RULE_ERRORS.ILLEGAL, 'Finish the auction first.');
    this.state.pendingTrade = null; // ending your turn cancels any open offer

    const player = currentPlayer(this.state);
    if (this.extraRoll && !player.inJail && !player.bankrupt) {
      this.extraRoll = false;
      this.state.phase = 'ROLLING';
      pushLog(this.state, 'system', `${player.name} rolled doubles — roll again!`);
    } else {
      this.advanceToNextPlayer();
    }
  }

  advanceToNextPlayer(): void {
    if (checkWin(this.state)) return;
    this.extraRoll = false;
    this.state.doublesCount = 0;
    this.state.lastCard = null;
    let i = this.state.currentPlayerIndex;
    do {
      i = (i + 1) % this.state.players.length;
    } while (this.state.players[i].bankrupt);
    this.state.currentPlayerIndex = i;
    this.state.turnCount += 1;
    this.state.phase = 'ROLLING';
    pushLog(this.state, 'system', `It's ${currentPlayer(this.state).name}'s turn.`);
  }

  dispose(): void {
    if (this.auctionTimer) clearTimeout(this.auctionTimer);
  }
}
