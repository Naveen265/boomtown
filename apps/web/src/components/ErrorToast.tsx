import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../net';

export default function ErrorToast() {
  const error = useGame((s) => s.error);
  const dismiss = useGame((s) => s.dismissError);
  return (
    <AnimatePresence>
      {error && (
        <motion.button
          onClick={dismiss}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed left-1/2 bottom-6 z-50 -translate-x-1/2 rounded-xl bg-red-500/95 px-4 py-3 text-sm font-semibold text-white shadow-pop"
        >
          {error.message}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
