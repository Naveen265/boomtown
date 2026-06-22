import { type GameState, JAIL_FINE, raisableCash } from '@boomtown/shared';
import { money } from '../lib';
import { useGame, selfPlayer } from '../net';

export default function ActionPanel({
  onOpenManage,
  onOpenTrade,
  onOpenProperty,
}: {
  onOpenManage: () => void;
  onOpenTrade: () => void;
  onOpenProperty: (tileId: number) => void;
}) {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const send = useGame((s) => s.send);

  const current = state.players[state.currentPlayerIndex];
  const isYourTurn = current?.id === self?.id;
  const myDebt = state.pendingDebt && self && state.pendingDebt.debtorId === self.id ? state.pendingDebt : null;
  const solventCount = state.players.filter((p) => !p.bankrupt).length;

  const doublesPending =
    isYourTurn &&
    state.phase === 'ACTION' &&
    state.lastDice &&
    state.lastDice[0] === state.lastDice[1] &&
    !current?.inJail &&
    state.pendingPurchaseTileId === null;

  return (
    <div className="space-y-2.5">
      {/* primary context action */}
      {myDebt ? (
        <div className="space-y-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
          <div className="text-center text-sm font-semibold text-red-300">
            You owe {money(myDebt.amount)} · {myDebt.reason}
            <span className="block text-xs font-normal text-sand-300/60">You can raise {money(raisableCash(state, self!.id))}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-primary" disabled={(self?.balance ?? 0) < myDebt.amount} onClick={() => send({ type: 'PAY_DEBT' })}>
              Pay
            </button>
            <button className="btn-ghost" onClick={onOpenManage}>
              Raise funds
            </button>
            <button className="btn-ghost text-red-300" onClick={() => send({ type: 'DECLARE_BANKRUPTCY' })}>
              Bankrupt
            </button>
          </div>
        </div>
      ) : state.phase === 'AUCTION' ? (
        <div className="rounded-xl border border-ember-500/40 bg-ember-500/10 p-3 text-center text-sm font-semibold text-ember-300">
          Auction in progress — place your bid
        </div>
      ) : state.phase === 'GAME_OVER' ? (
        <div className="rounded-xl bg-ink-700 p-3 text-center text-sm text-sand-300/70">The game is over.</div>
      ) : isYourTurn ? (
        <>
          {state.phase === 'ROLLING' && self?.inJail && (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-primary" onClick={() => send({ type: 'ROLL_FOR_JAIL' })}>
                Roll
              </button>
              <button className="btn-ghost" disabled={(self?.balance ?? 0) < JAIL_FINE} onClick={() => send({ type: 'PAY_JAIL_FINE' })}>
                Pay {money(JAIL_FINE)}
              </button>
              <button className="btn-ghost" disabled={(self?.getOutOfJailCards ?? 0) < 1} onClick={() => send({ type: 'USE_JAIL_CARD' })}>
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
            <button className="btn-primary w-full py-3.5 text-base" onClick={() => onOpenProperty(state.pendingPurchaseTileId!)}>
              Decide on {state.tiles[state.pendingPurchaseTileId].shortName ?? state.tiles[state.pendingPurchaseTileId].name}
            </button>
          )}
          {state.phase === 'ACTION' && state.pendingPurchaseTileId === null && (
            <button className="btn-primary w-full py-3.5 text-base" onClick={() => send({ type: 'END_TURN' })}>
              {doublesPending ? 'End step · roll again ↻' : 'End turn'}
            </button>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-ink-700 p-3 text-center text-sm text-sand-300/70">
          Waiting for <span className="font-bold" style={{ color: current?.color }}>{current?.name}</span>…
        </div>
      )}

      {/* secondary actions (kept visible, disabled + explained when illegal) */}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost py-2 text-sm" onClick={onOpenManage}>
          {isYourTurn && state.phase !== 'AUCTION' ? 'Manage assets' : 'View assets'}
        </button>
        <button
          className="btn-ghost py-2 text-sm"
          disabled={!isYourTurn || state.phase === 'AUCTION' || solventCount < 2 || !!myDebt}
          title={!isYourTurn ? 'You can only propose a trade on your turn' : solventCount < 2 ? 'No one to trade with' : undefined}
          onClick={onOpenTrade}
        >
          Propose trade
        </button>
      </div>
    </div>
  );
}
