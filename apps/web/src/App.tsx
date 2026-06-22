import { useGame } from './net';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import ErrorToast from './components/ErrorToast';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const joined = useGame((s) => s.joined);
  const phase = useGame((s) => s.state?.phase);

  let screen;
  if (!joined || !phase) screen = <Home />;
  else if (phase === 'LOBBY') screen = <Lobby />;
  else screen = <Game />;

  return (
    <div className="min-h-full">
      {screen}
      <OfflineBanner />
      <ErrorToast />
      <InstallPrompt />
    </div>
  );
}
