import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!evt || hidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl2 bg-ink-700 p-3 shadow-pop"
      >
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-lg" />
        <div className="flex-1 text-sm">
          <div className="font-display font-bold">Add Boomtown to your home screen</div>
          <div className="text-sand-300/70">Play full-screen, like an app.</div>
        </div>
        <button
          className="btn-ghost px-3 py-2 text-xs"
          onClick={() => setHidden(true)}
        >
          Later
        </button>
        <button
          className="btn-primary px-3 py-2 text-xs"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
          }}
        >
          Install
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
