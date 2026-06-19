import { GameOverReason, GameState } from "@/hooks/useOanQuan";
import { ScoreBreakdown } from "@/lib/oanquan/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type GameOverModalProps = {
  gameState: GameState;
  reason: GameOverReason | null;
  playerScore: ScoreBreakdown;
  aiScore: ScoreBreakdown;
  playerTotal: number;
  aiTotal: number;
  quanValue: number;
  onRestart: () => void;
};

function reasonText(
  reason: GameOverReason | null,
  playerWins: boolean,
  isDraw: boolean,
): { title: string; subtitle: string } {
  if (reason === "player_no_resources") {
    return {
      title: "Bạn đã thua",
      subtitle: "Bên bạn hết dân và đã bán hết quan, không còn gì để nạp.",
    };
  }
  if (reason === "ai_no_resources") {
    return {
      title: "Bạn đã thắng!",
      subtitle: "Bên Máy hết dân và đã bán hết quan, không còn gì để nạp.",
    };
  }
  if (reason === "player_blocked") {
    return {
      title: "Bạn đã thua",
      subtitle: "Bạn cần bán quan để nạp, nhưng Máy không đủ dân để mua.",
    };
  }
  if (reason === "ai_blocked") {
    return {
      title: "Bạn đã thắng!",
      subtitle: "Máy cần bán quan để nạp, nhưng Bạn không đủ dân để mua.",
    };
  }
  // quans_captured (or null fallback)
  const headline = playerWins
    ? "Bạn đã thắng!"
    : isDraw
      ? "Hòa nhau!"
      : "Máy thắng!";
  return {
    title: headline,
    subtitle: "Hết quan, tàn dân, thu quân, bán ruộng.",
  };
}

export function GameOverModal({
  gameState,
  reason,
  playerScore,
  aiScore,
  playerTotal,
  aiTotal,
  quanValue,
  onRestart,
}: GameOverModalProps) {
  if (gameState !== "game_over") return null;

  const isWin = playerTotal > aiTotal;
  const isDraw = playerTotal === aiTotal;
  const { title, subtitle } = reasonText(reason, isWin, isDraw);

  return (
    <AnimatePresence>
      {gameState === "game_over" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md overflow-hidden border shadow-2xl bg-card border-primary/20 rounded-2xl"
          >
            <div className="p-8 text-center space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary">
                  {title}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {subtitle}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ScoreCard
                  label="Bạn"
                  score={playerScore}
                  total={playerTotal}
                  quanValue={quanValue}
                  highlight={isWin}
                  highlightClass="text-primary"
                />
                <ScoreCard
                  label="Máy"
                  score={aiScore}
                  total={aiTotal}
                  quanValue={quanValue}
                  highlight={!isWin && !isDraw}
                  highlightClass="text-destructive"
                />
              </div>

              <Button
                onClick={onRestart}
                className="w-full gap-2 text-lg h-12 rounded-xl"
                size="lg"
              >
                <RefreshCw className="w-5 h-5" />
                Chơi ván mới
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ScoreCard({
  label,
  score,
  total,
  quanValue,
  highlight,
  highlightClass,
}: {
  label: string;
  score: ScoreBreakdown;
  total: number;
  quanValue: number;
  highlight: boolean;
  highlightClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 flex flex-col items-center gap-1">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-4xl font-serif font-bold ${highlight ? highlightClass : "text-foreground"}`}
      >
        {total}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5 mt-1 text-center">
        <div>
          <b>{score.dan}</b> dân
        </div>
        <div>
          <b>{score.quan}</b> quan × {quanValue}
        </div>
      </div>
    </div>
  );
}
