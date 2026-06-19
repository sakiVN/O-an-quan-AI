import React from "react";
import { AIDifficulty } from "@/lib/oanquan/ai";
import { GameState, QUAN_VALUE_OPTIONS } from "@/hooks/useOanQuan";
import { Player, ScoreBreakdown } from "@/lib/oanquan/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Undo2, RotateCcw, TriangleAlert } from "lucide-react";
import { RulesModal } from "./RulesModal";
import { motion } from "framer-motion";

// Depth at or above which we show a performance warning
const WARN_DEPTH = 10;

type ControlsProps = {
  playerScore: ScoreBreakdown;
  aiScore: ScoreBreakdown;
  quanValue: number;
  gameState: GameState;
  difficulty: AIDifficulty;
  onDifficultyChange: (d: AIDifficulty) => void;
  customDepth: number;
  onCustomDepthChange: (d: number) => void;
  onQuanValueChange: (v: number) => void;
  firstPlayer: Player;
  onFirstPlayerChange: (p: Player) => void;
  animationsEnabled: boolean;
  onAnimationsEnabledChange: (v: boolean) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
};

function ScoreBlock({
  label,
  score,
  quanValue,
  colorClass,
}: {
  label: string;
  score: ScoreBreakdown;
  quanValue: number;
  colorClass: string;
}) {
  const total = score.dan + score.quan * quanValue;
  return (
    <div className="flex flex-col items-center min-w-[5.5rem]">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div
        className={`text-3xl sm:text-4xl font-serif font-bold ${colorClass}`}
      >
        {total}
      </div>
      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          {score.dan} dân
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/80" />
          {score.quan} quan
        </span>
      </div>
    </div>
  );
}

export function Controls({
  playerScore,
  aiScore,
  quanValue,
  gameState,
  difficulty,
  onDifficultyChange,
  customDepth,
  onCustomDepthChange,
  onQuanValueChange,
  firstPlayer,
  onFirstPlayerChange,
  animationsEnabled,
  onAnimationsEnabledChange,
  onUndo,
  onReset,
  canUndo,
}: ControlsProps) {
  return (
    <div className="w-full flex flex-col gap-4 bg-card p-4 sm:p-6 rounded-3xl shadow-lg border border-primary/10 relative overflow-hidden">
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

      {/* Top row: scores + status + actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between z-10">
        {/* Scores */}
        <div className="flex items-center gap-4 sm:gap-6 justify-center">
          <ScoreBlock
            label="Bạn"
            score={playerScore}
            quanValue={quanValue}
            colorClass="text-primary"
          />

          <div className="flex flex-col items-center justify-center px-2">
            <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
              Điểm
            </div>
            <div className="w-px h-10 bg-border my-1" />
          </div>

          <ScoreBlock
            label="Máy"
            score={aiScore}
            quanValue={quanValue}
            colorClass="text-destructive"
          />
        </div>

        {/* Status indicator */}
        <div className="flex-1 flex justify-center py-2 md:py-0">
          <div className="bg-background px-6 py-3 rounded-full border border-primary/20 shadow-sm flex items-center gap-3">
            {gameState === "player_turn" && (
              <>
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="font-medium text-foreground">
                  Đến lượt bạn
                </span>
              </>
            )}
            {gameState === "player_needs_refill" && (
              <>
                <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                <span className="font-medium text-foreground">
                  Bạn cần nạp quân
                </span>
              </>
            )}
            {gameState === "ai_turn" && (
              <>
                <div className="w-3 h-3 rounded-full bg-destructive animate-ping" />
                <span className="font-medium text-foreground">
                  AI đang suy nghĩ...
                </span>
              </>
            )}
            {gameState === "animating" && (
              <>
                <div className="flex gap-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-secondary"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-secondary"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-secondary"
                  />
                </div>
                <span className="font-medium text-muted-foreground">
                  Đang rải quân...
                </span>
              </>
            )}
            {gameState === "game_over" && (
              <>
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="font-medium text-foreground">
                  Trò chơi kết thúc
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo || gameState === "animating"}
            className="h-10 w-10 rounded-xl border-primary/20 hover:bg-primary/10 hover:text-primary"
            title="Đi lại"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          <Button
            variant="default"
            onClick={onReset}
            className="h-10 rounded-xl gap-2 px-4 shadow-md hover:shadow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Ván mới</span>
          </Button>

          <RulesModal />
        </div>
      </div>

      {/* Settings row */}
      <div className="z-10 border-t border-border/60 pt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold sm:mr-1">
          Thiết lập
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-muted-foreground">Độ khó</label>
          <Select
            value={difficulty}
            onValueChange={(v) => onDifficultyChange(v as AIDifficulty)}
            disabled={gameState === "animating"}
          >
            <SelectTrigger className="w-[120px] bg-background border-primary/20 h-9 rounded-xl">
              <SelectValue placeholder="Độ khó" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Dễ</SelectItem>
              <SelectItem value="medium">Vừa</SelectItem>
              <SelectItem value="hard">Khó</SelectItem>
              <SelectItem value="custom">Tùy chỉnh</SelectItem>
            </SelectContent>
          </Select>

          {difficulty === "custom" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Độ sâu</label>
              <input
                type="number"
                min={1}
                max={20}
                value={customDepth}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 20) onCustomDepthChange(v);
                }}
                disabled={gameState === "animating"}
                className="w-16 h-9 text-center text-sm font-mono border border-primary/20 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground disabled:opacity-50"
              />
              {customDepth >= WARN_DEPTH && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-400/15 border border-amber-400/40 rounded-lg px-2 py-1">
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Độ sâu {customDepth} có thể làm AI suy nghĩ rất lâu!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">1 Quan =</label>
          <Select
            value={String(quanValue)}
            onValueChange={(v) => onQuanValueChange(Number(v))}
            disabled={gameState === "animating"}
          >
            <SelectTrigger className="w-[120px] bg-background border-primary/20 h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUAN_VALUE_OPTIONS.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v} điểm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Đi trước</label>
          <Select
            value={String(firstPlayer)}
            onValueChange={(v) => onFirstPlayerChange(Number(v) as Player)}
            disabled={gameState === "animating"}
          >
            <SelectTrigger className="w-[100px] bg-background border-primary/20 h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Bạn</SelectItem>
              <SelectItem value="1">Máy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="anim-toggle"
            className="text-sm text-muted-foreground select-none cursor-pointer"
          >
            Hiệu ứng
          </label>
          <Switch
            id="anim-toggle"
            checked={animationsEnabled}
            onCheckedChange={onAnimationsEnabledChange}
            disabled={gameState === "animating"}
          />
        </div>

        <span className="text-xs text-muted-foreground/70 italic sm:ml-auto">
          Thiết lập ván sẽ bắt đầu ván mới.
        </span>
      </div>
    </div>
  );
}
