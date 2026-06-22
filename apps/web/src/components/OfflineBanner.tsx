import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../net';

export default function OfflineBanner() {
  const connected = useGame((s) => s.connected);
  const joined = useGame((s) => s.joined);
  return (
    <AnimatePresence>
      {!connected && joined && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          exit={{ y: -40 }}
          className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-ink-900"
        >
          You’re offline — reconnecting…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
