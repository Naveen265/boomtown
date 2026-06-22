import type { Tile, GameState } from '@boomtown/shared';
import { groupColor, ownerOf, tileCell } from '../lib';
import TileLabel from './TileLabel';

const ICONS: Record<string, string> = {
  GO: '→',
  JAIL: '⛓',
  GOTO_JAIL: '🚓',
  FREE_PARKING: '🅿',
  TAX: '💸',
  FORTUNE: '✦',
  CIVIC: '⚑',
  TRANSPORT: '🚆',
  UTILITY: '⚡',
};

function stripSide(edge: ReturnType<typeof tileCell>['edge']): string {
  switch (edge) {
    case 'bottom':
      return 'top-0 inset-x-0 h-[16%]';
    case 'top':
      return 'bottom-0 inset-x-0 h-[16%]';
    case 'left':
      return 'right-0 inset-y-0 w-[16%]';
    case 'right':
      return 'left-0 inset-y-0 w-[16%]';
    default:
      return 'top-0 inset-x-0 h-0';
  }
}

// padding that keeps content off the color strip (which sits on the inner edge)
function contentInset(edge: ReturnType<typeof tileCell>['edge'], isProp: boolean): string {
  if (!isProp) return '';
  switch (edge) {
    case 'bottom':
      return 'pt-[16%]';
    case 'top':
      return 'pb-[16%]';
    case 'left':
      return 'pr-[16%]';
    case 'right':
      return 'pl-[16%]';
    default:
      return '';
  }
}

export default function TileView({
  tile,
  state,
  onClick,
}: {
  tile: Tile;
  state: GameState;
  onClick: () => void;
}) {
  const cell = tileCell(tile.id);
  const isCorner = cell.edge === 'corner';
  const vertical = cell.edge === 'left' || cell.edge === 'right';
  const owner = ownerOf(state, tile);
  const isProp = tile.type === 'PROPERTY';
  const houses = isProp ? (tile as any).houses : 0;
  const hotel = isProp ? (tile as any).hotel : false;
  const mortgaged = (tile as any).mortgaged;
  const price = (tile as any).price as number | undefined;
  const icon = !isProp ? ICONS[tile.type] : undefined;

  return (
    <button
      onClick={onClick}
      style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
      className={`tile-cell relative flex items-center justify-center overflow-hidden border border-black/40 bg-ink-700 text-center transition-colors hover:bg-ink-600 ${
        isCorner ? 'bg-ink-800' : ''
      }`}
    >
      {/* color band for districts (sits on the inner edge) */}
      {isProp && (
        <span className={`absolute ${stripSide(cell.edge)}`} style={{ backgroundColor: groupColor((tile as any).groupId) }} />
      )}
      {/* owner ring */}
      {owner && <span className="pointer-events-none absolute inset-0 border-2" style={{ borderColor: owner.color, opacity: 0.9 }} />}

      {/* content */}
      <div
        className={`relative z-10 flex h-full w-full items-center justify-center gap-px p-px ${
          vertical ? 'flex-row' : 'flex-col'
        } ${contentInset(cell.edge, isProp)}`}
      >
        {icon && <span className="shrink-0 text-[clamp(8px,17cqmin,15px)] leading-none">{icon}</span>}
        <TileLabel tile={tile} />
        {price !== undefined && !vertical && (
          <span className="tabular-nums text-[clamp(4px,15cqmin,9px)] text-sand-300/60">◈{price}</span>
        )}
      </div>

      {/* price on side tiles, tucked at the inner edge */}
      {price !== undefined && vertical && (
        <span
          className={`pointer-events-none absolute tabular-nums text-[clamp(4px,14cqmin,8px)] text-sand-300/60 ${
            cell.edge === 'left' ? 'right-[17%] top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180' : 'left-[17%] top-1/2 -translate-y-1/2 [writing-mode:vertical-rl]'
          }`}
        >
          ◈{price}
        </span>
      )}

      {/* buildings */}
      {(houses > 0 || hotel) && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-[1px] pb-[1px]">
          {hotel ? (
            <span className="h-[5px] w-[8px] rounded-[1px] bg-red-500" />
          ) : (
            Array.from({ length: houses }).map((_, i) => <span key={i} className="h-[4px] w-[4px] rounded-[1px] bg-teal-400" />)
          )}
        </div>
      )}
      {mortgaged && (
        <span className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 text-[clamp(6px,16cqmin,9px)] font-bold text-amber-400">
          MTG
        </span>
      )}
    </button>
  );
}
