import type { GameState, Player } from '@boomtown/shared';
import Board from './Board';
import BankerFeed from './BankerFeed';
import GameHeader from './GameHeader';
import TurnBanner from './TurnBanner';
import PlayerCard from './PlayerCard';
import BankSupply from './BankSupply';
import ActionPanel from './ActionPanel';

export default function GameDesktop({
  state,
  self,
  onTileClick,
  onOpenManage,
  onOpenTrade,
  onOpenProperty,
}: {
  state: GameState;
  self: Player | null;
  onTileClick: (id: number) => void;
  onOpenManage: () => void;
  onOpenTrade: () => void;
  onOpenProperty: (id: number) => void;
}) {
  const current = state.players[state.currentPlayerIndex];

  return (
    <div className="flex h-[100dvh] flex-col">
      <GameHeader state={state} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_384px] gap-5 px-5 pb-5">
        {/* board region */}
        <section className="flex min-h-0 items-center justify-center">
          <div className="aspect-square w-full" style={{ maxWidth: 'min(100%, calc(100dvh - 6rem))' }}>
            <Board state={state} onTileClick={onTileClick} />
          </div>
        </section>

        {/* side panel */}
        <aside className="flex min-h-0 flex-col gap-3 rounded-xl2 border border-white/5 bg-ink-800/60 p-3">
          <TurnBanner state={state} current={current} isYou={current?.id === self?.id} />

          <div className="scroll-thin flex max-h-[34%] flex-col gap-2 overflow-y-auto pr-0.5">
            {state.players.map((p) => (
              <PlayerCard key={p.id} player={p} state={state} isSelf={p.id === self?.id} isCurrent={p.id === current?.id} />
            ))}
          </div>

          <BankSupply state={state} />

          <ActionPanel onOpenManage={onOpenManage} onOpenTrade={onOpenTrade} onOpenProperty={onOpenProperty} />

          <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-ink-900/50">
            <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-sand-300/40">Banker feed</div>
            <div className="min-h-0 flex-1">
              <BankerFeed log={state.log} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
