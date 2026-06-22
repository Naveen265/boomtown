import type { Tile, GameState } from '@boomtown/shared';
import { groupColor, ownerOf, tileCell } from '../lib';

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
      return 'top-0 inset-x-0 h-[18%]';
    case 'top':
      return 'bottom-0 inset-x-0 h-[18%]';
    case 'left':
      return 'right-0 inset-y-0 w-[18%]';
    case 'right':
      return 'left-0 inset-y-0 w-[18%]';
    default:
      return 'top-0 inset-x-0 h-0';
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
  const owner = ownerOf(state, tile);
  const isProp = tile.type === 'PROPERTY';
  const houses = isProp ? (tile as any).houses : 0;
  const hotel = isProp ? (tile as any).hotel : false;
  const mortgaged = (tile as any).mortgaged;
  const price = (tile as any).price as number | undefined;

  return (
    <button
      onClick={onClick}
      style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
      className={`relative flex flex-col items-center justify-center overflow-hidden border border-black/40 bg-ink-700 p-0.5 text-center leading-none transition-colors hover:bg-ink-600 ${
        isCorner ? 'bg-ink-800' : ''
      }`}
    >
      {/* color strip for properties */}
      {isProp && (
        <span
          className={`absolute ${stripSide(cell.edge)}`}
          style={{ backgroundColor: groupColor((tile as any).groupId) }}
        />
      )}
      {/* owner ring */}
      {owner && (
        <span
          className="pointer-events-none absolute inset-0 border-2"
          style={{ borderColor: owner.color, opacity: 0.9 }}
        />
      )}

      <div className={`z-10 flex flex-col items-center ${isProp ? 'mt-[14%]' : ''}`}>
        {!isProp && (
          <span className="text-[clamp(7px,1.6vw,13px)]">{ICONS[tile.type] ?? ''}</span>
        )}
        <span className="line-clamp-2 px-0.5 text-[clamp(5px,1.05vw,9px)] font-semibold text-sand-200">
          {tile.name}
        </span>
        {price !== undefined && (
          <span className="text-[clamp(5px,1vw,8px)] text-sand-300/60">◈{price}</span>
        )}
      </div>

      {/* buildings */}
      {(houses > 0 || hotel) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-[1px] pb-[1px]">
          {hotel ? (
            <span className="h-[5px] w-[8px] rounded-[1px] bg-red-500" />
          ) : (
            Array.from({ length: houses }).map((_, i) => (
              <span key={i} className="h-[4px] w-[4px] rounded-[1px] bg-teal-400" />
            ))
          )}
        </div>
      )}
      {mortgaged && (
        <span className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 text-[7px] font-bold text-amber-400">
          MTG
        </span>
      )}
    </button>
  );
}
