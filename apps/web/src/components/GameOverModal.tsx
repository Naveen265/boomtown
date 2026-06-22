import { type GameState } from '@boomtown/shared';
import { netWorth } from '@boomtown/shared';
import { money } from '../lib';
import { TOKEN_EMOJI } from '../tokens';
import Modal from './Modal';
import { useGame } from '../net';

export default function GameOverModal() {
  const state = useGame((s) => s.state) as GameState;
  const leave = useGame((s) => s.leave);
  if (state.phase !== 'GAME_OVER') return <Modal open={false}><div /></Modal>;
  const winner = state.players.find((p) => p.id === state.winnerId);
  const ranked = [...state.players].sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || netWorth(state, b.id) - netWorth(state, a.id));

  return (
    <Modal open dismissable={false}>
      <div className="card p-6 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-2 font-display text-3xl font-extrabold">
          {winner ? <span style={{ color: winner.color }}>{winner.name}</span> : 'Nobody'} wins!
        </h2>
        <p className="text-sm text-sand-300/60">The boom belongs to the bold.</p>
        <div className="my-4 space-y-2 text-left">
          {ranked.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-ink-800 px-3 py-2">
              <span className="w-5 text-sm font-bold text-sand-300/50">{i + 1}</span>
              <span className="text-xl">{TOKEN_EMOJI[p.tokenId]}</span>
              <span className="flex-1 font-semibold" style={{ color: p.color }}>{p.name}</span>
              <span className={`text-sm ${p.bankrupt ? 'text-red-400 line-through' : 'text-teal-400'}`}>
                {p.bankrupt ? 'Bankrupt' : money(netWorth(state, p.id))}
              </span>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={leave}>
          Back to menu
        </button>
      </div>
    </Modal>
  );
}
