import { useMemo, useState } from 'react';
import { type GameState, type OwnableTile, isOwnable } from '@boomtown/shared';
import { money, groupColor } from '../lib';
import Modal from './Modal';
import { useGame, selfPlayer } from '../net';

function AssetPicker({
  state,
  ownerId,
  selected,
  toggle,
}: {
  state: GameState;
  ownerId: string;
  selected: number[];
  toggle: (id: number) => void;
}) {
  const tiles = state.tiles.filter((t): t is OwnableTile => isOwnable(t) && (t as OwnableTile).ownerId === ownerId);
  if (tiles.length === 0) return <p className="py-2 text-xs text-sand-300/40">No properties.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tiles.map((t) => (
        <button
          key={t.id}
          onClick={() => toggle(t.id)}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
            selected.includes(t.id) ? 'border-teal-400 bg-teal-500/20' : 'border-white/10 bg-ink-800'
          }`}
        >
          <span className="h-3 w-2 rounded" style={{ backgroundColor: groupColor(t.groupId) }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}

function CashStepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={Math.max(0, max)}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-ember-500"
      />
      <span className="w-16 text-right text-sm tabular-nums">{money(value)}</span>
    </div>
  );
}

export function TradeBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer)!;
  const propose = useGame((s) => s.proposeTrade);
  const others = state.players.filter((p) => p.id !== self.id && !p.bankrupt);
  const [toId, setToId] = useState<string | null>(others[0]?.id ?? null);
  const [offerTiles, setOfferTiles] = useState<number[]>([]);
  const [reqTiles, setReqTiles] = useState<number[]>([]);
  const [offerCash, setOfferCash] = useState(0);
  const [reqCash, setReqCash] = useState(0);
  const [offerJail, setOfferJail] = useState(0);
  const [reqJail, setReqJail] = useState(0);

  const to = others.find((p) => p.id === toId);
  const toggle = (set: React.Dispatch<React.SetStateAction<number[]>>) => (id: number) =>
    set((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const reset = () => {
    setOfferTiles([]); setReqTiles([]); setOfferCash(0); setReqCash(0); setOfferJail(0); setReqJail(0);
  };

  const submit = () => {
    if (!toId) return;
    propose({
      fromId: self.id,
      toId,
      offerTileIds: offerTiles,
      offerCash,
      offerJailCards: offerJail,
      requestTileIds: reqTiles,
      requestCash: reqCash,
      requestJailCards: reqJail,
    });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="card p-5">
        <h3 className="mb-3 font-display text-xl font-bold">Propose a trade</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => { setToId(p.id); setReqTiles([]); }}
              className={`chip ${toId === p.id ? 'bg-ember-500 text-ink-900' : 'bg-ink-800'}`}
              style={toId === p.id ? {} : { color: p.color }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-ink-800 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-400">You give</div>
            <AssetPicker state={state} ownerId={self.id} selected={offerTiles} toggle={toggle(setOfferTiles)} />
            <CashStepper value={offerCash} max={self.balance} onChange={setOfferCash} />
            {self.getOutOfJailCards > 0 && (
              <label className="mt-1 flex items-center justify-between text-xs">
                Release Writs: {offerJail}/{self.getOutOfJailCards}
                <span className="flex gap-1">
                  <button className="btn-ghost px-2 py-0.5" onClick={() => setOfferJail(Math.max(0, offerJail - 1))}>−</button>
                  <button className="btn-ghost px-2 py-0.5" onClick={() => setOfferJail(Math.min(self.getOutOfJailCards, offerJail + 1))}>+</button>
                </span>
              </label>
            )}
          </div>

          <div className="rounded-xl bg-ink-800 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ember-400">You get</div>
            {to ? (
              <>
                <AssetPicker state={state} ownerId={to.id} selected={reqTiles} toggle={toggle(setReqTiles)} />
                <CashStepper value={reqCash} max={to.balance} onChange={setReqCash} />
                {to.getOutOfJailCards > 0 && (
                  <label className="mt-1 flex items-center justify-between text-xs">
                    Release Writs: {reqJail}/{to.getOutOfJailCards}
                    <span className="flex gap-1">
                      <button className="btn-ghost px-2 py-0.5" onClick={() => setReqJail(Math.max(0, reqJail - 1))}>−</button>
                      <button className="btn-ghost px-2 py-0.5" onClick={() => setReqJail(Math.min(to.getOutOfJailCards, reqJail + 1))}>+</button>
                    </span>
                  </label>
                )}
              </>
            ) : (
              <p className="text-xs text-sand-300/50">Pick a player.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!toId || (offerTiles.length + reqTiles.length + offerCash + reqCash + offerJail + reqJail === 0)}
            onClick={submit}
          >
            Send offer
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TradeReview() {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const send = useGame((s) => s.send);
  const trade = state.pendingTrade;
  const isRecipient = trade && self && trade.toId === self.id;

  const summary = useMemo(() => {
    if (!trade) return null;
    const from = state.players.find((p) => p.id === trade.fromId);
    const names = (ids: number[]) => ids.map((id) => state.tiles[id].name).join(', ') || '—';
    return { from, names };
  }, [trade, state]);

  if (!trade || !isRecipient || !summary) return <Modal open={false}><div /></Modal>;

  return (
    <Modal open dismissable={false}>
      <div className="card p-5">
        <h3 className="mb-1 font-display text-xl font-bold">Trade offer</h3>
        <p className="mb-3 text-sm text-sand-300/70">
          <span className="font-bold" style={{ color: summary.from?.color }}>{summary.from?.name}</span> proposes:
        </p>
        <div className="space-y-2">
          <div className="rounded-xl bg-ink-800 p-3">
            <div className="text-xs font-bold uppercase text-teal-400">You receive</div>
            <div className="text-sm">{summary.names(trade.offerTileIds)}</div>
            {trade.offerCash > 0 && <div className="text-sm">{money(trade.offerCash)} cash</div>}
            {trade.offerJailCards > 0 && <div className="text-sm">{trade.offerJailCards} Release Writ(s)</div>}
          </div>
          <div className="rounded-xl bg-ink-800 p-3">
            <div className="text-xs font-bold uppercase text-ember-400">You give</div>
            <div className="text-sm">{summary.names(trade.requestTileIds)}</div>
            {trade.requestCash > 0 && <div className="text-sm">{money(trade.requestCash)} cash</div>}
            {trade.requestJailCards > 0 && <div className="text-sm">{trade.requestJailCards} Release Writ(s)</div>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => send({ type: 'RESPOND_TRADE', accept: false })}>Reject</button>
          <button className="btn-primary" onClick={() => send({ type: 'RESPOND_TRADE', accept: true })}>Accept</button>
        </div>
      </div>
    </Modal>
  );
}
