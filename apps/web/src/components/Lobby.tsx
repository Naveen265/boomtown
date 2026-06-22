import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ALL_TOKENS,
  TOKEN_LABELS,
  type HouseRules,
} from '@boomtown/shared';
import { TOKEN_EMOJI } from '../tokens';
import { useGame, selfPlayer } from '../net';

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-teal-500' : 'bg-ink-500'} disabled:opacity-50`}
    >
      <motion.span
        layout
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

const RULE_LABELS: { key: keyof HouseRules; label: string; hint: string }[] = [
  { key: 'auctionsEnabled', label: 'Auctions', hint: 'Declined properties go to auction' },
  { key: 'freeParkingJackpot', label: 'Free Parking jackpot', hint: 'Taxes & fines pile up on Free Parking' },
  { key: 'doubleGoOnLanding', label: 'Double GO bonus', hint: 'Landing exactly on GO pays double' },
  { key: 'buildingShortage', label: 'Building shortage', hint: 'Limited house & hotel supply' },
];

export default function Lobby() {
  const state = useGame((s) => s.state)!;
  const self = useGame(selfPlayer);
  const setReady = useGame((s) => s.setReady);
  const setToken = useGame((s) => s.setToken);
  const updateHouseRules = useGame((s) => s.updateHouseRules);
  const startGame = useGame((s) => s.startGame);
  const leave = useGame((s) => s.leave);
  const [copied, setCopied] = useState(false);

  const isHost = self?.isHost;
  const takenTokens = new Set(state.players.map((p) => p.tokenId));
  const allReady = state.players.length >= 2 && state.players.every((p) => p.ready || p.isHost);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Lobby</h2>
        <button className="text-sm text-sand-300/60 hover:text-sand-100" onClick={leave}>
          Leave
        </button>
      </div>

      <button onClick={copyCode} className="card mb-5 p-5 text-center active:scale-[0.99]">
        <div className="text-xs font-semibold uppercase tracking-wide text-sand-300/60">Room code · tap to copy</div>
        <div className="font-display text-5xl font-extrabold tracking-[0.3em] text-ember-500">{state.roomCode}</div>
        <div className="mt-1 text-xs text-teal-400">{copied ? 'Copied!' : 'Share this with your friends'}</div>
      </button>

      <div className="card mb-5 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-300/60">
          Players ({state.players.length}/6)
        </div>
        <div className="space-y-2">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5">
              <span className="text-2xl">{TOKEN_EMOJI[p.tokenId]}</span>
              <span className="flex-1 font-semibold" style={{ color: p.color }}>
                {p.name}
                {p.id === self?.id && <span className="ml-1 text-xs text-sand-300/50">(you)</span>}
              </span>
              {p.isHost && <span className="chip bg-ember-600/30 text-ember-400">Host</span>}
              {!p.isHost && (
                <span className={`chip ${p.ready ? 'bg-teal-600/30 text-teal-400' : 'bg-ink-600 text-sand-300/60'}`}>
                  {p.ready ? 'Ready' : 'Not ready'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-5 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-300/60">Your token</div>
        <div className="flex flex-wrap gap-2">
          {ALL_TOKENS.map((t) => {
            const taken = takenTokens.has(t) && self?.tokenId !== t;
            return (
              <button
                key={t}
                disabled={taken}
                onClick={() => setToken(t)}
                title={TOKEN_LABELS[t]}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl transition-colors ${
                  self?.tokenId === t ? 'border-ember-500 bg-ink-600' : 'border-transparent bg-ink-800'
                } ${taken ? 'opacity-25' : ''}`}
              >
                {TOKEN_EMOJI[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card mb-5 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-sand-300/60">
          House rules {!isHost && <span className="text-sand-300/40">(host controls)</span>}
        </div>
        <div className="space-y-3">
          {RULE_LABELS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-sand-300/50">{hint}</div>
              </div>
              <Toggle
                on={state.houseRules[key] as boolean}
                disabled={!isHost}
                onClick={() => updateHouseRules({ [key]: !state.houseRules[key] } as Partial<HouseRules>)}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 border-t border-white/5 pt-3">
            <div className="flex-1 text-sm font-semibold">Starting balance</div>
            <div className="flex items-center gap-2">
              {[1000, 1500, 2000].map((amt) => (
                <button
                  key={amt}
                  disabled={!isHost}
                  onClick={() => updateHouseRules({ startingBalance: amt })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    state.houseRules.startingBalance === amt ? 'bg-ember-500 text-ink-900' : 'bg-ink-800 text-sand-300/70'
                  } disabled:opacity-50`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2.5">
        {!isHost && (
          <button
            className={self?.ready ? 'btn-ghost w-full py-3' : 'btn-teal w-full py-3 text-base'}
            onClick={() => setReady(!self?.ready)}
          >
            {self?.ready ? 'Not ready' : "I'm ready"}
          </button>
        )}
        {isHost && (
          <button className="btn-primary w-full py-3.5 text-base" disabled={!allReady} onClick={startGame}>
            {state.players.length < 2 ? 'Need 2+ players' : allReady ? 'Start game' : 'Waiting for players…'}
          </button>
        )}
      </div>
    </div>
  );
}
