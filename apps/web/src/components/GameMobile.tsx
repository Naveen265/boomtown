import { useState } from 'react';
import type { GameState, Player } from '@boomtown/shared';
import { groupColor } from '../lib';
import { TOKEN_EMOJI } from '../tokens';
import Board from './Board';
import BankerFeed from './BankerFeed';
import GameHeader from './GameHeader';
import PlayerCard from './PlayerCard';
import BankSupply from './BankSupply';
import ActionPanel from './ActionPanel';
import AnimatedMoney from './AnimatedMoney';

type Tab = 'players' | 'feed' | 'assets';

export default function GameMobile({
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
  const [tab, setTab] = useState<Tab>('players');
  const current = state.players[state.currentPlayerIndex];
  const myTiles = self ? self.ownedTileIds.map((id) => state.tiles[id]) : [];

  return (
    <div className="flex h-[100dvh] flex-col">
      <GameHeader state={state} />

      {/* board */}
      <div className="shrink-0 px-2">
        <Board state={state} onTileClick={onTileClick} />
      </div>

      {/* tabbed bottom sheet */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col border-t border-white/5">
        <div className="flex gap-1 px-3 pt-2">
          {(['players', 'feed', 'assets'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
                tab === t ? 'bg-ink-600 text-sand-100' : 'text-sand-300/50 hover:text-sand-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {tab === 'players' && (
            <div className="flex flex-col gap-2">
              {state.players.map((p) => (
                <PlayerCard key={p.id} player={p} state={state} isSelf={p.id === self?.id} isCurrent={p.id === current?.id} />
              ))}
              <BankSupply state={state} />
            </div>
          )}
          {tab === 'feed' && <BankerFeed log={state.log} />}
          {tab === 'assets' && (
            <div className="flex flex-col gap-1.5">
              {myTiles.length === 0 && <div className="text-xs text-sand-300/40">You don’t own any districts yet.</div>}
              {myTiles.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onOpenProperty(t.id)}
                  className="flex items-center gap-2 rounded-lg bg-ink-700 px-2.5 py-2 text-left hover:bg-ink-600"
                >
                  <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.type === 'PROPERTY' ? groupColor((t as any).groupId) : '#5b6473' }} />
                  <span className="flex-1 text-sm">{t.name}</span>
                  {(t as any).mortgaged && <span className="text-[10px] font-bold text-amber-400">MTG</span>}
                  {(t as any).hotel ? (
                    <span className="text-[10px] text-red-400">🏨</span>
                  ) : (t as any).houses > 0 ? (
                    <span className="text-[10px] text-teal-400">🏠×{(t as any).houses}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* sticky HUD dock: current balance + primary context action */}
      <div className="sticky bottom-0 shrink-0 space-y-2 border-t border-white/10 bg-ink-800/95 px-4 py-3 backdrop-blur">
        {self && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="text-base">{TOKEN_EMOJI[self.tokenId]}</span>
              <span className="text-sand-300/60">Your balance</span>
            </span>
            <AnimatedMoney value={self.balance} className="text-lg font-bold tabular-nums" />
          </div>
        )}
        <ActionPanel onOpenManage={onOpenManage} onOpenTrade={onOpenTrade} onOpenProperty={onOpenProperty} />
      </div>
    </div>
  );
}
