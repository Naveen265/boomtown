import { useState } from 'react';
import { motion } from 'framer-motion';
import { ALL_TOKENS, TOKEN_LABELS, TOKEN_COLORS, type TokenId } from '@boomtown/shared';
import { TOKEN_EMOJI } from '../tokens';
import { useGame } from '../net';

export default function Home() {
  const [name, setName] = useState(localStorage.getItem('boomtown.name') ?? '');
  const [token, setToken] = useState<TokenId>('crane');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const createRoom = useGame((s) => s.createRoom);
  const joinRoom = useGame((s) => s.joinRoom);
  const joining = useGame((s) => s.joining);

  const remember = () => localStorage.setItem('boomtown.name', name.trim());
  const nameOk = name.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-10">
      <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-20 w-20 rounded-2xl shadow-pop" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          BOOM<span className="text-ember-500">TOWN</span>
        </h1>
        <p className="mt-1 text-sm text-sand-300/70">Build the city. Bankrupt your rivals.</p>
      </motion.div>

      <div className="card space-y-5 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sand-300/60">
            Your name
          </label>
          <input
            className="input"
            placeholder="e.g. Aria"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={remember}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-sand-300/60">
            Pick your token
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_TOKENS.map((t) => (
              <button
                key={t}
                onClick={() => setToken(t)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
                  token === t ? 'border-ember-500 bg-ink-600' : 'border-transparent bg-ink-800'
                }`}
              >
                <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.4))' }}>
                  {TOKEN_EMOJI[t]}
                </span>
                <span className="text-xs font-semibold" style={{ color: TOKEN_COLORS[t] }}>
                  {TOKEN_LABELS[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {mode === 'menu' ? (
          <div className="space-y-2.5 pt-1">
            <button
              className="btn-primary w-full py-3 text-base"
              disabled={!nameOk || joining}
              onClick={() => {
                remember();
                createRoom(name.trim(), token);
              }}
            >
              Create a game
            </button>
            <button className="btn-ghost w-full py-3 text-base" onClick={() => setMode('join')}>
              Join with a code
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <input
              className="input text-center font-display text-2xl tracking-[0.4em] uppercase"
              placeholder="CODE"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <button
              className="btn-teal w-full py-3 text-base"
              disabled={!nameOk || code.length !== 5 || joining}
              onClick={() => {
                remember();
                joinRoom(code, name.trim(), token);
              }}
            >
              Join game
            </button>
            <button className="btn-ghost w-full py-2 text-sm" onClick={() => setMode('menu')}>
              Back
            </button>
          </div>
        )}
      </div>

      <p className="mt-auto pt-8 text-center text-xs text-sand-300/40">
        2–6 players · share your room code to invite friends
      </p>
    </div>
  );
}
