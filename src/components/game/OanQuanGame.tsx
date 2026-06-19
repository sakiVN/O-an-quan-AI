import React, { useState } from "react";
import { BoardView } from "./BoardView";
import { Controls } from "./Controls";
import { GameOverModal } from "./GameOverModal";
import { DebugPanel } from "./DebugPanel";
import { useOanQuan } from "@/hooks/useOanQuan";
import { Button } from "@/components/ui/button";
import { Coins, AlertTriangle, Bug } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function OanQuanGame() {
  const [debugMode, setDebugMode] = useState(false);

  const {
    board,
    gameState,
    gameOverReason,
    difficulty,
    setDifficulty,
    customDepth,
    setCustomDepth,
    quanValue,
    setQuanValue,
    firstPlayer,
    setFirstPlayer,
    animationsEnabled,
    setAnimationsEnabled,
    highlight,
    makePlayerMove,
    refillPlayer,
    resetGame,
    undoMove,
    history,
    refillCost,
    debugSetBoard,
  } = useOanQuan();

  const playerCanRefill = board.canContinue(0);
  const playerScoreTotal = board.totalPoints(0);
  const aiScoreTotal = board.totalPoints(1);
  const playerDan = board.playerScore.dan;
  const playerQuan = board.playerScore.quan;
  const aiDan = board.aiScore.dan;
  // How will refill be paid?
  const refillNeedsToSell =
    gameState === "player_needs_refill" && playerDan < refillCost;
  const refillBlockedReason: string | null = (() => {
    if (!refillNeedsToSell) return null;
    if (playerQuan < 1) {
      return `Bạn chỉ còn ${playerDan} dân, không có quan để bán. Bạn không thể nạp quân.`;
    }
    if (aiDan < quanValue) {
      return `Bạn cần bán quan để nạp, nhưng Máy chỉ còn ${aiDan} dân (cần ${quanValue}) – không đủ để mua.`;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <header className="w-full py-6 text-center shrink-0">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary tracking-tight">Ô Ăn Quan</h1>
        <p className="text-muted-foreground mt-2 font-medium tracking-wide">Trò chơi dân gian Việt Nam</p>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-12 flex flex-col gap-8 justify-center">
        
        <Controls 
          playerScore={board.playerScore}
          aiScore={board.aiScore}
          quanValue={quanValue}
          gameState={gameState}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          customDepth={customDepth}
          onCustomDepthChange={setCustomDepth}
          onQuanValueChange={setQuanValue}
          firstPlayer={firstPlayer}
          onFirstPlayerChange={setFirstPlayer}
          animationsEnabled={animationsEnabled}
          onAnimationsEnabledChange={setAnimationsEnabled}
          onUndo={undoMove}
          onReset={resetGame}
          canUndo={history.length > 0 && gameState === "player_turn"}
        />

        <div className="relative">
          <BoardView 
            board={board} 
            onMove={makePlayerMove} 
            isPlayerTurn={gameState === "player_turn"}
            highlight={highlight}
          />
        </div>

        <AnimatePresence>
          {gameState === "player_needs_refill" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-2xl mx-auto bg-card border-2 border-primary/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="font-serif text-lg font-bold text-foreground">
                  Bên bạn đã hết quân
                </div>
                <div className="text-sm text-muted-foreground">
                  {refillBlockedReason ? (
                    refillBlockedReason
                  ) : refillNeedsToSell && playerCanRefill ? (
                    <>
                      Bạn chỉ còn <b>{playerDan} dân</b>, cần bán{" "}
                      <b>1 quan</b> cho Máy đổi <b>{quanValue} dân</b> rồi nạp{" "}
                      {refillCost} dân vào hàng.
                    </>
                  ) : (
                    <>
                      Nạp <b>{refillCost} dân</b> từ kho của bạn để rải tiếp.
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={refillPlayer}
                disabled={!playerCanRefill}
                size="lg"
                className="rounded-xl gap-2 shadow-md"
              >
                {playerCanRefill ? (
                  <>
                    <Coins className="w-4 h-4" />
                    {refillNeedsToSell
                      ? `Bán 1 quan & nạp`
                      : `Nạp ${refillCost} dân`}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Không thể nạp
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move History / Log + Debug toggle */}
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
          {/* Header row — always visible */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50" />
              Nhật ký nước đi
            </h3>
            <button
              onClick={() => setDebugMode((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
                debugMode
                  ? "bg-amber-400/20 border-amber-400/60 text-amber-600"
                  : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <Bug className="w-3.5 h-3.5" />
              Debug
            </button>
          </div>

          {/* Log entries */}
          {history.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {[...history].reverse().map((entry, idx) => {
                  const who = entry.player === 0 ? "Bạn" : "Máy";

                  if (entry.refill || !entry.move || !entry.result) {
                    const sold = entry.refillQuanSold ?? 0;
                    const refillText =
                      sold > 0
                        ? `Bán ${sold} quan & nạp ${refillCost} dân để tiếp tục`
                        : `Nạp ${refillCost} dân để tiếp tục`;
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="font-medium text-foreground">{who}</span>
                        <span className="text-muted-foreground italic">{refillText}</span>
                      </div>
                    );
                  }

                  const captures = entry.result.captures;
                  const capturedPoints = captures.reduce((acc, c) => acc + c.points, 0);
                  const capturedText = capturedPoints > 0
                    ? `(+${capturedPoints} điểm${captures.some(c => c.isQuan) ? " • có Quan" : ""})`
                    : "";

                  return (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="font-medium text-foreground">{who}</span>
                      <span className="text-muted-foreground">
                        Rải từ ô {entry.move.pit} sang {entry.move.direction === "L" ? "trái" : "phải"}{" "}
                        {capturedText && <span className="text-accent-foreground font-bold">{capturedText}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Debug panel */}
          <AnimatePresence>
            {debugMode && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <DebugPanel board={board} onBoardChange={debugSetBoard} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <GameOverModal 
        gameState={gameState} 
        reason={gameOverReason}
        playerScore={board.playerScore}
        aiScore={board.aiScore}
        playerTotal={playerScoreTotal}
        aiTotal={aiScoreTotal}
        quanValue={quanValue}
        onRestart={resetGame}
      />
    </div>
  );
}
