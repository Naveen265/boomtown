import type { Tile } from '@boomtown/shared';
import { tileCell } from '../lib';

/**
 * The single source of truth for rendering a tile's name on the board.
 *
 * Rules (see §1 of the overhaul brief):
 *  - Side-column tiles rotate the label 90° (vertical writing-mode) so long
 *    names gain length room and sit on one line.
 *  - Top/bottom (and corner) tiles keep horizontal text, scale with the tile via
 *    container-query units, and may wrap to at most 2 balanced lines.
 *  - Words are never split mid-character (`word-break: keep-all`) and names are
 *    never truncated/ellipsised. `shortName` is used on the board when present.
 */
export default function TileLabel({ tile, className = '' }: { tile: Tile; className?: string }) {
  const { edge } = tileCell(tile.id);
  const vertical = edge === 'left' || edge === 'right';
  const label = tile.shortName ?? tile.name;

  return (
    <span
      className={`tile-label ${vertical ? 'tile-label--v' : 'tile-label--h'} ${className}`}
      data-edge={edge}
      title={tile.name}
    >
      {label}
    </span>
  );
}
