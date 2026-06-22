import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../net';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Face({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <motion.div
      animate={rolling ? { rotate: [0, -18, 16, -10, 0], y: [0, -8, 4, -3, 0] } : { rotate: 0, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid h-[clamp(26px,7vw,46px)] w-[clamp(26px,7vw,46px)] grid-cols-3 grid-rows-3 gap-[2px] rounded-xl bg-sand-100 p-1.5 shadow-pop"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full ${PIPS[value]?.includes(i) ? 'bg-ink-900' : 'bg-transparent'}`}
        />
      ))}
    </motion.div>
  );
}

export default function Dice() {
  const dice = useGame((s) => s.dice);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!dice) return;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), 600);
    return () => clearTimeout(t);
  }, [dice?.nonce]);

  if (!dice) return null;
  return (
    <div className="pointer-events-none flex gap-2">
      <Face value={dice.dice[0]} rolling={rolling} />
      <Face value={dice.dice[1]} rolling={rolling} />
    </div>
  );
}
