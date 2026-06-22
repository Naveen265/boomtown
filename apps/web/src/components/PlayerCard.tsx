import { motion } from 'framer-motion';
import type { GameState, Player } from '@boomtown/shared';
import { holdings } from '../lib';
import { TOKEN_EMOJI } from '../tokens';
import AnimatedMoney from './AnimatedMoney';

export default function PlayerCard({
  player,
  state,
  isSelf,
  isCurrent,
}: {
  player: Player;
  state: GameState;
  isSelf: boolean;
  isCurrent: boolean;
}) {
  const { properties, monopolies } = holdings(state, player.id);

  return (
    <motion.div
      layout
      className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        isCurrent ? 'border-gold/70 bg-ink-600' : 'border-white/5 bg-ink-700'
      } ${player.bankrupt ? 'opacity-40 grayscale' : ''}`}
      style={isCurrent ? { boxShadow: `0 0 0 1px ${player.color}55, 0 0 22px ${player.color}33` } : undefined}
    >
      {/* color rail */}
      <span className="absolute inset-y-2 left-0 w-1 rounded-full" style={{ backgroundColor: player.color }} />

      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ backgroundColor: player.color + '22' }}>
        {TOKEN_EMOJI[player.tokenId]}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="break-words font-semibold" style={{ color: player.color }}>
            {player.name}
          </span>
          {isSelf && <span className="text-[10px] text-sand-300/50">you</span>}
          {player.isHost && <span className="chip bg-ember-600/25 px-1.5 py-0 text-[10px] text-ember-400">host</span>}
          {!player.isConnected && <span title="disconnected" className="text-amber-400">⚠</span>}
          {player.inJail && <span title="in the Holding Cell">⛓</span>}
        </div>
        <AnimatedMoney value={player.balance} className="text-lg font-bold tabular-nums" />
      </div>

      {/* holdings */}
      <div className="flex flex-col items-end gap-1 text-[11px]">
        <span className="chip bg-ink-800 text-sand-300/70" title="properties owned">
          🏠 {properties}
        </span>
        {monopolies > 0 && (
          <span className="chip bg-teal-600/25 text-teal-300" title="complete color groups">
            ★ {monopolies}
          </span>
        )}
        {player.getOutOfJailCards > 0 && (
          <span className="chip bg-gold/20 text-gold" title="Release Writs">
            ✎ {player.getOutOfJailCards}
          </span>
        )}
      </div>
    </motion.div>
  );
}
