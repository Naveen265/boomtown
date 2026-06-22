import { motion } from 'framer-motion';
import type { GameState, Player } from '@boomtown/shared';
import { TOKEN_EMOJI } from '../tokens';

const PHASE_LABEL: Record<string, string> = {
  ROLLING: 'to roll',
  ACTION: 'in play',
  AUCTION: 'auction in progress',
  GAME_OVER: 'game over',
};

export default function TurnBanner({ state, current, isYou }: { state: GameState; current: Player; isYou: boolean }) {
  return (
    <motion.div
      key={current.id + state.phase}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl2 p-3"
      style={{ background: `linear-gradient(100deg, ${current.color}22, transparent 70%)`, border: `1px solid ${current.color}40` }}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ backgroundColor: current.color + '33' }}>
        {TOKEN_EMOJI[current.tokenId]}
      </span>
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-widest text-sand-300/50">Turn {state.turnCount}</div>
        <div className="font-display text-lg font-bold">
          <span style={{ color: current.color }}>{isYou ? 'Your turn' : current.name}</span>{' '}
          <span className="text-sm font-normal text-sand-300/60">· {PHASE_LABEL[state.phase] ?? ''}</span>
        </div>
      </div>
    </motion.div>
  );
}
