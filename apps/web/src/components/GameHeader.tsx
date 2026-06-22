import type { GameState } from '@boomtown/shared';
import { useGame } from '../net';

export default function GameHeader({ state }: { state: GameState }) {
  const leave = useGame((s) => s.leave);
  return (
    <header className="flex shrink-0 items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight">
          BOOM<span className="text-ember-500">TOWN</span>
        </span>
        <span className="chip whitespace-nowrap bg-ink-700 font-mono tracking-[0.2em] text-sand-300/70">{state.roomCode}</span>
      </div>
      <button className="rounded-lg px-2 py-1 text-xs text-sand-300/50 transition-colors hover:bg-ink-700 hover:text-sand-100" onClick={leave}>
        Leave
      </button>
    </header>
  );
}
