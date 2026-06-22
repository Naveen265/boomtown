import { useEffect, useState } from 'react';
import { type GameState, AUCTION_MIN_INCREMENT } from '@boomtown/shared';
import { money } from '../lib';
import Modal from './Modal';
import { useGame, selfPlayer } from '../net';

export default function AuctionModal() {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const send = useGame((s) => s.send);
  const auction = state.auction;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (!auction) return <Modal open={false}><div /></Modal>;

  const tile = state.tiles[auction.tileId];
  const highBidder = state.players.find((p) => p.id === auction.highBidderId);
  const inAuction = self ? auction.activePlayerIds.includes(self.id) : false;
  const folded = self ? !inAuction : true;
  const minBid = auction.highBidderId ? auction.highBid + AUCTION_MIN_INCREMENT : AUCTION_MIN_INCREMENT;
  const secsLeft = Math.max(0, Math.ceil((auction.endsAt - now) / 1000));
  const canAfford = (amt: number) => (self?.balance ?? 0) >= amt;

  return (
    <Modal open dismissable={false}>
      <div className="card p-5">
        <div className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-ember-400">Auction</div>
        <h3 className="text-center font-display text-2xl font-extrabold">{tile.name}</h3>
        <div className="my-3 text-center">
          <div className="text-4xl font-extrabold tabular-nums">{money(auction.highBid)}</div>
          <div className="text-sm text-sand-300/70">
            {highBidder ? <>high bid · <span style={{ color: highBidder.color }}>{highBidder.name}</span></> : 'no bids yet'}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full bg-ember-500 transition-[width] duration-200"
              style={{ width: `${Math.min(100, (secsLeft / 12) * 100)}%` }}
            />
          </div>
          <span className="w-8 text-sm font-bold tabular-nums">{secsLeft}s</span>
        </div>

        {self?.bankrupt ? (
          <p className="text-center text-sm text-sand-300/60">You’re out of the game.</p>
        ) : folded ? (
          <p className="text-center text-sm text-sand-300/60">You’ve dropped out — watching the bids.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[minBid, minBid + 20, minBid + 50].map((amt) => (
                <button
                  key={amt}
                  className="btn-teal py-2.5 text-sm"
                  disabled={!canAfford(amt)}
                  onClick={() => send({ type: 'BID', amount: amt })}
                >
                  Bid {money(amt)}
                </button>
              ))}
            </div>
            <button className="btn-ghost w-full" onClick={() => send({ type: 'FOLD_AUCTION' })}>
              Drop out
            </button>
            <div className="text-center text-xs text-sand-300/50">Your balance: {money(self?.balance ?? 0)}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
