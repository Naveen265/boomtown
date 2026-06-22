import { motion } from 'framer-motion';
import type { GameState } from '@boomtown/shared';
import { tileCenter, tokenOffset } from '../lib';
import { TOKEN_EMOJI } from '../tokens';
import TileView from './TileView';
import Dice from './Dice';

export default function Board({
  state,
  onTileClick,
}: {
  state: GameState;
  onTileClick: (id: number) => void;
}) {
  const active = state.players.filter((p) => !p.bankrupt);
  // group players by tile to fan-out tokens
  const byTile = new Map<number, string[]>();
  for (const p of active) {
    const arr = byTile.get(p.position) ?? [];
    arr.push(p.id);
    byTile.set(p.position, arr);
  }

  return (
    <div className="relative aspect-square w-full select-none">
      <div className="grid h-full w-full grid-cols-11 grid-rows-11 overflow-hidden rounded-xl2 bg-ink-900 shadow-pop">
        {state.tiles.map((tile) => (
          <TileView key={tile.id} tile={tile} state={state} onClick={() => onTileClick(tile.id)} />
        ))}

        {/* center */}
        <div className="pointer-events-none col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-3">
          <div
            className="font-display text-[clamp(18px,5vw,40px)] font-extrabold leading-none tracking-tight"
            style={{ transform: 'rotate(-8deg)' }}
          >
            BOOM<span className="text-ember-500">TOWN</span>
          </div>
          <Dice />
        </div>
      </div>

      {/* token layer */}
      <div className="pointer-events-none absolute inset-0">
        {active.map((p) => {
          const c = tileCenter(p.position);
          const peers = byTile.get(p.position) ?? [p.id];
          const idx = peers.indexOf(p.id);
          const off = tokenOffset(idx, peers.length);
          const isCurrent = state.players[state.currentPlayerIndex]?.id === p.id;
          return (
            <motion.div
              key={p.id}
              className="absolute flex h-[8.5%] w-[8.5%] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              initial={false}
              animate={{ left: `calc(${c.x * 100}% + ${off.dx}%)`, top: `calc(${c.y * 100}% + ${off.dy}%)` }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-[clamp(10px,2.4vw,20px)] shadow-pop ring-2"
                style={{
                  backgroundColor: p.color,
                  boxShadow: isCurrent ? `0 0 0 3px #f2c84b, 0 6px 14px rgba(0,0,0,.5)` : undefined,
                }}
              >
                <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }}>{TOKEN_EMOJI[p.tokenId]}</span>
              </div>
              {p.inJail && (
                <span className="absolute -bottom-1 rounded bg-black/70 px-1 text-[7px] font-bold text-amber-400">
                  JAIL
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
