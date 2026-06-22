import { useEffect, useState } from 'react';
import { type GameState, JAIL_FINE, raisableCash } from '@boomtown/shared';
import { money } from '../lib';
import { TOKEN_EMOJI } from '../tokens';
import { useGame, selfPlayer } from '../net';
import Board from './Board';
import BankerFeed from './BankerFeed';
import AnimatedMoney from './AnimatedMoney';
import PropertyModal from './PropertyModal';
import AuctionModal from './AuctionModal';
import ManageModal from './ManageModal';
import { TradeBuilder, TradeReview } from './TradeModal';
import GameOverModal from './GameOverModal';
import CardPopup from './CardPopup';

export default function Game() {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const send = useGame((s) => s.send);
  const leave = useGame((s) => s.leave);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  const current = state.players[state.currentPlayerIndex];
  const isYourTurn = current?.id === self?.id;
  const myDebt = state.pendingDebt && self && state.pendingDebt.debtorId === self.id ? state.pendingDebt : null;

  // auto-open the property card when you must decide to buy
  useEffect(() => {
    if (state.pendingPurchaseTileId !== null && isYourTurn) setSelectedTile(state.pendingPurchaseTileId);
  }, [state.pendingPurchaseTileId, isYourTurn]);

  const doublesPending =
    isYourTurn &&
    state.phase === 'ACTION' &&
    state.lastDice &&
    state.lastDice[0] === state.lastDice[1] &&
    !current?.inJail &&
    state.pendingPurchaseTileId === null;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-xl flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-extrabold">
            BOOM<span className="text-ember-500">TOWN</span>
          </span>
          <span className="chip bg-ink-700 font-mono tracking-widest text-sand-300/70">{state.roomCode}</span>
        </div>
        <button className="text-xs text-sand-300/50 hover:text-sand-100" onClick={leave}>
          Leave
        </button>
      </header>

      {/* players strip */}
      <div className="scroll-thin flex gap-2 overflow-x-auto px-3 pb-2">
        {state.players.map((p) => {
          const isCur = p.id === current?.id;
          return (
            <div
              key={p.id}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 ${
                isCur ? 'bg-ink-600 ring-2 ring-gold' : 'bg-ink-800'
              } ${p.bankrupt ? 'opacity-40' : ''}`}
            >
              <span className="text-lg">{TOKEN_EMOJI[p.tokenId]}</span>
              <div className="leading-tight">
                <div className="text-xs font-semibold" style={{ color: p.color }}>
                  {p.name}
                  {p.id === self?.id && ' (you)'}
                  {!p.isConnected && <span className="ml-1 text-amber-400">⚠</span>}
                </div>
                <AnimatedMoney value={p.balance} className="text-xs font-bold tabular-nums text-sand-200" />
              </div>
              {p.inJail && <span className="text-[10px]">⛓</span>}
            </div>
          );
        })}
      </div>

      {/* board */}
      <div className="px-2">
        <Board state={state} onTileClick={(id) => setSelectedTile(id)} />
      </div>

      {/* banker feed */}
      <div className="mt-1 min-h-0 flex-1 border-t border-white/5">
        <div className="px-4 pt-2 text-[10px] font-bold uppercase tracking-widest text-sand-300/40">Banker feed</div>
        <div className="h-[calc(100%-20px)]">
          <BankerFeed log={state.log} />
        </div>
      </div>

      {/* action dock */}
      <div className="sticky bottom-0 border-t border-white/10 bg-ink-800/95 px-4 py-3 backdrop-blur">
        {myDebt ? (
          <div className="space-y-2">
            <div className="text-center text-sm font-semibold text-red-400">
              You owe {money(myDebt.amount)} ({myDebt.reason}). Raisable: {money(raisableCash(state, self!.id))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="btn-primary"
                disabled={(self?.balance ?? 0) < myDebt.amount}
                onClick={() => send({ type: 'PAY_DEBT' })}
              >
                Pay {money(myDebt.amount)}
              </button>
              <button className="btn-ghost" onClick={() => setManageOpen(true)}>
                Raise funds
              </button>
              <button className="btn-ghost text-red-400" onClick={() => send({ type: 'DECLARE_BANKRUPTCY' })}>
                Bankrupt
              </button>
            </div>
          </div>
        ) : state.phase === 'AUCTION' ? (
          <div className="text-center text-sm font-semibold text-ember-400">Auction in progress…</div>
        ) : isYourTurn ? (
          <div className="space-y-2">
            {state.phase === 'ROLLING' && self?.inJail && (
              <div className="grid grid-cols-3 gap-2">
                <button className="btn-primary" onClick={() => send({ type: 'ROLL_FOR_JAIL' })}>
                  Roll
                </button>
                <button
                  className="btn-ghost"
                  disabled={(self?.balance ?? 0) < JAIL_FINE}
                  onClick={() => send({ type: 'PAY_JAIL_FINE' })}
                >
                  Pay {money(JAIL_FINE)}
                </button>
                <button
                  className="btn-ghost"
                  disabled={(self?.getOutOfJailCards ?? 0) < 1}
                  onClick={() => send({ type: 'USE_JAIL_CARD' })}
                >
                  Use Writ
                </button>
              </div>
            )}
            {state.phase === 'ROLLING' && !self?.inJail && (
              <button className="btn-primary w-full py-3.5 text-base" onClick={() => send({ type: 'ROLL' })}>
                🎲 Roll the dice
              </button>
            )}
            {state.phase === 'ACTION' && state.pendingPurchaseTileId !== null && (
              <button className="btn-primary w-full py-3" onClick={() => setSelectedTile(state.pendingPurchaseTileId)}>
                Decide on {state.tiles[state.pendingPurchaseTileId].name}
              </button>
            )}
            {state.phase === 'ACTION' && state.pendingPurchaseTileId === null && (
              <button className="btn-primary w-full py-3.5 text-base" onClick={() => send({ type: 'END_TURN' })}>
                {doublesPending ? 'End step — you rolled doubles, roll again!' : 'End turn'}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost py-2 text-sm" onClick={() => setManageOpen(true)}>
                Manage assets
              </button>
              <button
                className="btn-ghost py-2 text-sm"
                disabled={state.players.filter((p) => !p.bankrupt).length < 2}
                onClick={() => setTradeOpen(true)}
              >
                Propose trade
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-sand-300/70">
              Waiting for <span className="font-bold" style={{ color: current?.color }}>{current?.name}</span>…
            </span>
            <button className="btn-ghost py-2 text-sm" onClick={() => setManageOpen(true)}>
              View assets
            </button>
          </div>
        )}
      </div>

      {/* modals */}
      <PropertyModal tileId={selectedTile} onClose={() => setSelectedTile(null)} />
      <AuctionModal />
      <ManageModal open={manageOpen} onClose={() => setManageOpen(false)} onSelect={(id) => { setManageOpen(false); setSelectedTile(id); }} />
      <TradeBuilder open={tradeOpen} onClose={() => setTradeOpen(false)} />
      <TradeReview />
      <GameOverModal />
      <CardPopup />
    </div>
  );
}
