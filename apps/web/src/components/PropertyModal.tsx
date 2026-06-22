import {
  type GameState,
  type PropertyTile,
  type TransportTile,
  GROUP_LABELS,
  isOwnable,
} from '@boomtown/shared';
import { money, groupColor, ownerOf } from '../lib';
import Modal from './Modal';
import { useGame, selfPlayer } from '../net';

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? 'font-bold' : ''}`}>
      <span className="text-sand-300/70">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function PropertyModal({ tileId, onClose }: { tileId: number | null; onClose: () => void }) {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const send = useGame((s) => s.send);

  if (tileId === null) return <Modal open={false} onClose={onClose}><div /></Modal>;
  const tile = state.tiles[tileId];
  const open = tileId !== null;
  if (!isOwnable(tile)) {
    return (
      <Modal open={open} onClose={onClose}>
        <div className="card p-5">
          <h3 className="font-display text-xl font-bold">{tile.name}</h3>
          <p className="mt-2 text-sm text-sand-300/70">
            {tile.type === 'TAX'
              ? `Pay ${money((tile as any).amount)} when you land here.`
              : tile.type === 'FORTUNE'
                ? 'Draw a Fortune card.'
                : tile.type === 'CIVIC'
                  ? 'Draw a Civic card.'
                  : 'A special tile.'}
          </p>
          <button className="btn-ghost mt-4 w-full" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const owner = ownerOf(state, tile);
  const youOwn = owner?.id === self?.id;
  const isYourTurn = state.players[state.currentPlayerIndex]?.id === self?.id;
  const canManage = youOwn && isYourTurn && (state.phase === 'ROLLING' || state.phase === 'ACTION');
  const pendingBuy = state.pendingPurchaseTileId === tileId && isYourTurn && state.phase === 'ACTION';

  return (
    <Modal open={open} onClose={pendingBuy ? undefined : onClose} dismissable={!pendingBuy}>
      <div className="card overflow-hidden">
        <div className="p-4 text-center" style={{ backgroundColor: groupColor((tile as any).groupId) }}>
          <div className="text-xs font-bold uppercase tracking-widest text-black/60">
            {tile.type === 'PROPERTY' ? GROUP_LABELS[(tile as PropertyTile).groupId] : tile.type === 'TRANSPORT' ? 'Transit Line' : 'Civic Works'}
          </div>
          <div className="font-display text-2xl font-extrabold text-ink-900">{tile.name}</div>
        </div>

        <div className="p-5">
          {owner ? (
            <div className="mb-2 text-sm">
              Owned by <span className="font-bold" style={{ color: owner.color }}>{owner.name}{youOwn ? ' (you)' : ''}</span>
              {(tile as any).mortgaged && <span className="ml-2 chip bg-amber-500/20 text-amber-400">Mortgaged</span>}
            </div>
          ) : (
            <div className="mb-2 text-sm text-sand-300/60">Unowned</div>
          )}

          <Row label="List price" value={money((tile as any).price)} />
          <Row label="Mortgage value" value={money((tile as any).mortgageValue)} />

          {tile.type === 'PROPERTY' && (
            <div className="mt-2 rounded-xl bg-ink-800 p-3">
              {(['Base rent', 'With 1 house', '2 houses', '3 houses', '4 houses', 'Hotel'] as const).map((lbl, i) => (
                <Row key={lbl} label={lbl} value={money((tile as PropertyTile).rent[i])} bold={i === (tile as PropertyTile).houses && !(tile as PropertyTile).hotel} />
              ))}
              <div className="mt-1 border-t border-white/5 pt-1">
                <Row label="House cost" value={money((tile as PropertyTile).houseCost)} />
              </div>
            </div>
          )}
          {tile.type === 'TRANSPORT' && (
            <div className="mt-2 rounded-xl bg-ink-800 p-3">
              <Row label="1 line owned" value={money((tile as TransportTile).baseRent)} />
              <Row label="2 lines" value={money((tile as TransportTile).baseRent * 2)} />
              <Row label="3 lines" value={money((tile as TransportTile).baseRent * 4)} />
              <Row label="4 lines" value={money((tile as TransportTile).baseRent * 8)} />
            </div>
          )}
          {tile.type === 'UTILITY' && (
            <div className="mt-2 rounded-xl bg-ink-800 p-3 text-sm text-sand-300/80">
              Rent = dice roll × 4 (one Civic Works) or × 10 (both).
            </div>
          )}

          {/* actions */}
          <div className="mt-4 space-y-2">
            {pendingBuy && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-primary py-3"
                  disabled={(self?.balance ?? 0) < (tile as any).price}
                  onClick={() => { send({ type: 'BUY' }); onClose(); }}
                >
                  Buy · {money((tile as any).price)}
                </button>
                <button className="btn-ghost py-3" onClick={() => { send({ type: 'DECLINE_BUY' }); onClose(); }}>
                  {state.houseRules.auctionsEnabled ? 'Auction it' : 'Pass'}
                </button>
              </div>
            )}

            {canManage && (tile as any).mortgaged && (
              <button className="btn-teal w-full" onClick={() => send({ type: 'UNMORTGAGE', tileId })}>
                Unmortgage · {money(Math.ceil((tile as any).mortgageValue * 1.1))}
              </button>
            )}
            {canManage && !(tile as any).mortgaged && (
              <>
                {tile.type === 'PROPERTY' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="btn-teal"
                      disabled={(self?.balance ?? 0) < (tile as PropertyTile).houseCost || (tile as PropertyTile).hotel}
                      onClick={() => send({ type: 'BUILD', tileId })}
                    >
                      Build · {money((tile as PropertyTile).houseCost)}
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={(tile as PropertyTile).houses === 0 && !(tile as PropertyTile).hotel}
                      onClick={() => send({ type: 'SELL_BUILDING', tileId })}
                    >
                      Sell building
                    </button>
                  </div>
                )}
                <button className="btn-ghost w-full" onClick={() => send({ type: 'MORTGAGE', tileId })}>
                  Mortgage · {money((tile as any).mortgageValue)}
                </button>
              </>
            )}

            {!pendingBuy && (
              <button className="btn-ghost w-full" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
