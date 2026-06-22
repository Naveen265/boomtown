import { useEffect, useState } from 'react';
import { type GameState } from '@boomtown/shared';
import { useGame, selfPlayer } from '../net';
import { useIsDesktop } from '../hooks';
import GameDesktop from './GameDesktop';
import GameMobile from './GameMobile';
import PropertyModal from './PropertyModal';
import AuctionModal from './AuctionModal';
import ManageModal from './ManageModal';
import { TradeBuilder, TradeReview } from './TradeModal';
import GameOverModal from './GameOverModal';
import CardPopup from './CardPopup';

export default function Game() {
  const state = useGame((s) => s.state) as GameState;
  const self = useGame(selfPlayer);
  const isDesktop = useIsDesktop();

  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  const isYourTurn = state.players[state.currentPlayerIndex]?.id === self?.id;

  // auto-open the property card when you must decide to buy
  useEffect(() => {
    if (state.pendingPurchaseTileId !== null && isYourTurn) setSelectedTile(state.pendingPurchaseTileId);
  }, [state.pendingPurchaseTileId, isYourTurn]);

  const layoutProps = {
    state,
    self,
    onTileClick: (id: number) => setSelectedTile(id),
    onOpenManage: () => setManageOpen(true),
    onOpenTrade: () => setTradeOpen(true),
    onOpenProperty: (id: number) => setSelectedTile(id),
  };

  return (
    <>
      {isDesktop ? <GameDesktop {...layoutProps} /> : <GameMobile {...layoutProps} />}

      {/* modals (shared across layouts) */}
      <PropertyModal tileId={selectedTile} onClose={() => setSelectedTile(null)} />
      <AuctionModal />
      <ManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onSelect={(id) => {
          setManageOpen(false);
          setSelectedTile(id);
        }}
      />
      <TradeBuilder open={tradeOpen} onClose={() => setTradeOpen(false)} />
      <TradeReview />
      <GameOverModal />
      <CardPopup />
    </>
  );
}
