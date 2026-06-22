import { useEffect, useRef } from 'react';
import type { GameLogEntry } from '@boomtown/shared';

const KIND_COLOR: Record<GameLogEntry['kind'], string> = {
  money: 'text-teal-400',
  move: 'text-sand-300/80',
  system: 'text-ember-400',
  trade: 'text-purple-300',
  card: 'text-gold',
};

export default function BankerFeed({ log }: { log: GameLogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [log.length]);

  return (
    <div ref={ref} className="scroll-thin h-full overflow-y-auto px-3 py-2">
      <div className="space-y-1.5">
        {log.slice(-60).map((e) => (
          <div key={e.id} className="flex gap-2 text-xs leading-snug">
            <span className="mt-0.5 select-none text-sand-300/30">›</span>
            <span className={KIND_COLOR[e.kind]}>{e.text}</span>
          </div>
        ))}
        {log.length === 0 && <div className="text-xs text-sand-300/40">The banker’s feed will appear here…</div>}
      </div>
    </div>
  );
}
