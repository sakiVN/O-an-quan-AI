import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Board } from "@/lib/oanquan/board";
import { Direction, QUAN_LEFT, QUAN_RIGHT } from "@/lib/oanquan/types";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/hooks/useOanQuan";

type BoardViewProps = {
  board: Board;
  onMove: (pit: number, direction: Direction) => void;
  isPlayerTurn: boolean;
  highlight?: Highlight;
};

type HighlightKind = NonNullable<Highlight>["kind"];

function highlightClass(kind: HighlightKind | undefined): string {
  if (kind === "pickup") return "ring-4 ring-primary/70 shadow-[0_0_18px_rgba(200,80,50,0.55)] scale-[1.03] bg-primary/10";
  if (kind === "drop") return "ring-2 ring-secondary/80 shadow-[0_0_14px_rgba(120,160,100,0.55)] scale-[1.02] bg-secondary/15";
  if (kind === "skip") return "ring-2 ring-muted-foreground/40 shadow-[0_0_10px_rgba(150,150,150,0.4)] bg-muted/30";
  if (kind === "capture") return "ring-4 ring-accent/90 shadow-[0_0_24px_rgba(220,170,40,0.85)] scale-[1.05] bg-accent/25";
  return "";
}

function pitPoints(count: number, hasLiveQuan: boolean, quanValue: number): number {
  if (count <= 0) return 0;
  return hasLiveQuan ? quanValue + (count - 1) : count;
}

function ScoreBadge({ pts }: { pts: number }) {
  return (
    <div className="rounded-full bg-background/75 backdrop-blur-sm border border-primary/20 px-1.5 py-px text-[10px] sm:text-[11px] font-semibold text-foreground/80 leading-none shadow-sm whitespace-nowrap">
      {pts}
    </div>
  );
}

function PitStones({ count, hasLiveQuan }: { count: number; hasLiveQuan: boolean }) {
  if (count <= 0) return null;

  if (hasLiveQuan) {
    const extras = Math.max(0, count - 1);
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-1">
        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-primary/80 shadow-sm shadow-black/20 shrink-0" />
        {extras > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-0.5">
            {Array.from({ length: Math.min(extras, 8) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary/70" />
            ))}
            {extras > 8 && <span className="text-[9px] sm:text-[10px] font-semibold text-foreground/75">+{extras - 8}</span>}
          </div>
        )}
      </div>
    );
  }

  // stone size stays constant for 1×1 → 3×3; only shrinks for denser grids
  let cols: number;
  let stoneClass: string;
  if (count <= 1) {
    cols = 1;
    stoneClass = "w-3 h-3 sm:w-3.5 sm:h-3.5";
  } else if (count <= 4) {
    cols = 2;
    stoneClass = "w-3 h-3 sm:w-3.5 sm:h-3.5";
  } else if (count <= 9) {
    cols = 3;
    stoneClass = "w-3 h-3 sm:w-3.5 sm:h-3.5";
  } else if (count <= 16) {
    cols = 4;
    stoneClass = "w-2 h-2 sm:w-2.5 sm:h-2.5";
  } else {
    cols = 5;
    stoneClass = "w-1.5 h-1.5 sm:w-2 sm:h-2";
  }

  const maxShown = cols * cols;
  const shown = Math.min(count, maxShown);
  const overflow = Math.max(0, count - maxShown);
  const rows: number[] = [];
  let remaining = shown;
  while (remaining > 0) {
    const n = Math.min(cols, remaining);
    rows.push(n);
    remaining -= n;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-1">
      <div className="relative flex flex-col items-center gap-0.5 sm:gap-1">
        {rows.map((rowCount, ri) => (
          <div key={ri} className="flex gap-0.5 sm:gap-1 justify-center">
            {Array.from({ length: rowCount }).map((_, ci) => (
              <div
                key={ci}
                className={cn(
                  "rounded-full bg-secondary shadow-[inset_-1px_-1px_2px_rgba(0,0,0,0.3),1px_1px_2px_rgba(0,0,0,0.15)]",
                  stoneClass,
                )}
              />
            ))}
          </div>
        ))}

        {overflow > 0 && (
          <div className="absolute -top-1.5 -right-2 z-20 rounded-full bg-background/75 backdrop-blur-sm border border-primary/20 px-1 py-px text-[9px] sm:text-[10px] font-semibold text-foreground/80 leading-none shadow-sm whitespace-nowrap">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}

function QuanPit({
  count,
  hasLiveQuan,
  quanValue,
  quanSide,
  hlKind,
}: {
  count: number;
  hasLiveQuan: boolean;
  quanValue: number;
  quanSide: "left" | "right";
  hlKind?: HighlightKind;
}) {
  const pts = pitPoints(count, hasLiveQuan, quanValue);
  const shapeClass =
    quanSide === "left"
      ? "rounded-tl-[999px] rounded-bl-[999px] rounded-tr-2xl rounded-br-2xl"
      : "rounded-tr-[999px] rounded-br-[999px] rounded-tl-2xl rounded-bl-2xl";

  // Badge column sits outside the D-shape but inside the board's overflow boundary.
  // quanSide="left"  → badge on the LEFT  (outer edge), D-shape on the right
  // quanSide="right" → badge on the RIGHT (outer edge), D-shape on the left
  const badgeColumn = (
    <div className="w-5 sm:w-7 flex-shrink-0 flex items-center justify-center">
      {count > 0 && (
        <div
          className={cn(
            "pointer-events-none",
            quanSide === "left" ? "rotate-90" : "-rotate-90",
          )}
        >
          <ScoreBadge pts={pts} />
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("flex-shrink-0 flex items-stretch", quanSide === "left" ? "flex-row" : "flex-row-reverse")}>
      {badgeColumn}
      <div className="relative w-12 sm:w-24">
        <div
          className={cn(
            "absolute inset-0 bg-background/50 border-4 border-primary/20 shadow-inner transition-all duration-150 overflow-hidden",
            shapeClass,
            hlKind && highlightClass(hlKind),
          )}
        >
          <PitStones count={count} hasLiveQuan={hasLiveQuan} />
        </div>
      </div>
    </div>
  );
}

export function BoardView({ board, onMove, isPlayerTurn, highlight }: BoardViewProps) {
  const [selectedPit, setSelectedPit] = useState<number | null>(null);

  const hlKind = (idx: number): HighlightKind | undefined =>
    highlight && highlight.cell === idx ? highlight.kind : undefined;

  useEffect(() => {
    if (!isPlayerTurn) setSelectedPit(null);
  }, [isPlayerTurn]);

  const handlePitClick = (index: number) => {
    if (!isPlayerTurn) return;
    if (board.cells[index] === 0) return;
    if (index === QUAN_LEFT || index === QUAN_RIGHT) return;
    setSelectedPit(selectedPit === index ? null : index);
  };

  const handleDirection = (direction: Direction) => {
    if (selectedPit !== null) {
      onMove(selectedPit, direction);
      setSelectedPit(null);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-card rounded-3xl shadow-xl border border-primary/10 overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />

      {/*
        pt-8/pb-8 (32px) gives enough room for score badges (offset -top-5/-bottom-5 = 20px)
        to stay fully inside the overflow-hidden card boundary.
      */}
      <div className="relative z-10 flex flex-row items-stretch gap-1 sm:gap-2 px-2 pt-8 pb-8 sm:px-5 sm:pt-9 sm:pb-9">
        <QuanPit
          count={board.cells[QUAN_RIGHT]}
          hasLiveQuan={board.quanAliveRight}
          quanValue={board.quanValue}
          quanSide="left"
          hlKind={hlKind(QUAN_RIGHT)}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-2.5">
          <div className="flex gap-1 sm:gap-2.5 h-16 sm:h-24">
            {[10, 9, 8, 7, 6].map((idx) => {
              const pts = pitPoints(board.cells[idx], false, board.quanValue);
              return (
                <div key={idx} className="relative flex-1">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-primary/10 bg-background/40 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-150",
                      hlKind(idx) && highlightClass(hlKind(idx)),
                    )}
                  >
                    <PitStones count={board.cells[idx]} hasLiveQuan={false} />
                  </div>
                  {board.cells[idx] > 0 && (
                    <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <ScoreBadge pts={pts} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full h-px bg-primary/15 rounded-full" />

          <div className="flex gap-1 sm:gap-2.5 h-16 sm:h-24">
            {[0, 1, 2, 3, 4].map((idx) => {
              const isSelected = selectedPit === idx;
              const hasStones = board.cells[idx] > 0;
              const isSelectable = isPlayerTurn && hasStones;
              const hl = hlKind(idx);
              const pts = pitPoints(board.cells[idx], false, board.quanValue);

              return (
                <div key={idx} className="relative flex-1">
                  <div
                    role="button"
                    tabIndex={isSelectable || isSelected ? 0 : -1}
                    onClick={() => handlePitClick(idx)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handlePitClick(idx); }}
                    aria-label={`Ô ${idx}: ${board.cells[idx]} quân (${pts} điểm)`}
                    aria-pressed={isSelected}
                    className={cn(
                      "absolute inset-0 rounded-xl sm:rounded-2xl border-2 shadow-[inset_0_3px_6px_rgba(0,0,0,0.05)] transition-all duration-150 overflow-hidden outline-none",
                      "focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_14px_rgba(200,80,50,0.3)] ring-2 ring-primary/50 cursor-pointer"
                        : isSelectable
                          ? "bg-background/60 border-primary/20 hover:border-primary/50 hover:bg-background/80 hover:-translate-y-0.5 cursor-pointer"
                          : "bg-background/30 border-transparent opacity-75 cursor-default",
                      hl && highlightClass(hl),
                    )}
                  >
                    <PitStones count={board.cells[idx]} hasLiveQuan={false} />

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center gap-1.5 sm:gap-2 z-20 rounded-xl sm:rounded-2xl"
                        >
                          <button onClick={(e) => { e.stopPropagation(); handleDirection("L"); }} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent hover:text-accent-foreground transition-all" aria-label="Đi trái">
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPit(null); }} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all" aria-label="Huỷ">
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDirection("R"); }} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent hover:text-accent-foreground transition-all" aria-label="Đi phải">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {board.cells[idx] > 0 && (
                    <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <ScoreBadge pts={pts} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <QuanPit
          count={board.cells[QUAN_LEFT]}
          hasLiveQuan={board.quanAliveLeft}
          quanValue={board.quanValue}
          quanSide="right"
          hlKind={hlKind(QUAN_LEFT)}
        />
      </div>
    </div>
  );
}
