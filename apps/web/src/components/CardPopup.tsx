import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../net';

export default function CardPopup() {
  const lastCard = useGame((s) => s.state?.lastCard ?? null);
  const [shown, setShown] = useState<{ deck: string; text: string; key: number } | null>(null);

  useEffect(() => {
    if (!lastCard) {
      setShown(null);
      return;
    }
    setShown({ ...lastCard, key: Date.now() });
    const t = setTimeout(() => setShown(null), 4200);
    return () => clearTimeout(t);
  }, [lastCard?.text]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.key}
          initial={{ rotateX: 80, y: -40, opacity: 0 }}
          animate={{ rotateX: 0, y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-16 z-40 mx-auto w-[86%] max-w-sm"
          onClick={() => setShown(null)}
        >
          <div
            className={`rounded-xl2 p-5 text-center shadow-pop ${
              shown.deck === 'FORTUNE' ? 'bg-gold text-ink-900' : 'bg-teal-500 text-ink-900'
            }`}
          >
            <div className="text-xs font-extrabold uppercase tracking-[0.3em]">
              {shown.deck === 'FORTUNE' ? '✦ Fortune' : '⚑ Civic'}
            </div>
            <div className="mt-2 font-display text-lg font-bold leading-snug">{shown.text}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
