import type { GameState } from '@boomtown/shared';
import { money } from '../lib';

export default function BankSupply({ state }: { state: GameState }) {
  const shortage = state.houseRules.buildingShortage;
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-700 px-3 py-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-sand-300/50">Bank supply</span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1" title="houses available">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-teal-400" />
          <span className="tabular-nums">{shortage ? state.housesRemaining : '∞'}</span>
        </span>
        <span className="flex items-center gap-1" title="hotels available">
          <span className="inline-block h-2.5 w-3.5 rounded-[2px] bg-red-500" />
          <span className="tabular-nums">{shortage ? state.hotelsRemaining : '∞'}</span>
        </span>
        {state.houseRules.freeParkingJackpot && (
          <span className="flex items-center gap-1 text-gold" title="Free Parking pot">
            🅿 <span className="tabular-nums">{money(state.freeParkingPot)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
