import { type GameState, type OwnableTile, isOwnable } from '@boomtown/shared';
import { money, groupColor } from '../lib';
import { netWorth } from '@boomtown/shared';
import Modal from './Modal';
import { useGame, selfPlayer } from '../net';

export default function ManageModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (tileId: number) => void;
}) {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  if (!self) return null;

  const owned = state.tiles.filter((t): t is OwnableTile => isOwnable(t) && (t as OwnableTile).ownerId === self.id);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Your assets</h3>
          <span className="chip bg-ink-800 text-teal-400">Net worth {money(netWorth(state, self.id))}</span>
        </div>
        {owned.length === 0 ? (
          <p className="py-6 text-center text-sm text-sand-300/50">You don’t own anything yet.</p>
        ) : (
          <div className="space-y-2">
            {owned.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5 text-left hover:bg-ink-600"
              >
                <span className="h-8 w-2 rounded" style={{ backgroundColor: groupColor(t.groupId) }} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-sand-300/60">
                    {t.type === 'PROPERTY'
                      ? (t as any).hotel
                        ? 'Hotel'
                        : `${(t as any).houses} house(s)`
                      : t.type === 'TRANSPORT'
                        ? 'Transit line'
                        : 'Civic works'}
                  </span>
                </span>
                {t.mortgaged && <span className="chip bg-amber-500/20 text-amber-400">MTG</span>}
                <span className="text-sand-300/40">›</span>
              </button>
            ))}
          </div>
        )}
        <button className="btn-ghost mt-4 w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
