import React, { useEffect, useState } from "react";
import { Board } from "@/lib/oanquan/board";
import { QUAN_LEFT, QUAN_RIGHT } from "@/lib/oanquan/types";
import { cn } from "@/lib/utils";

type DebugPanelProps = {
  board: Board;
  onBoardChange: (b: Board) => void;
};

type DraftBoard = {
  cells: number[];
  quanAliveLeft: boolean;
  quanAliveRight: boolean;
  playerDan: number;
  playerQuan: number;
  aiDan: number;
  aiQuan: number;
};

function fromBoard(b: Board): DraftBoard {
  return {
    cells: [...b.cells],
    quanAliveLeft: b.quanAliveLeft,
    quanAliveRight: b.quanAliveRight,
    playerDan: b.playerScore.dan,
    playerQuan: b.playerScore.quan,
    aiDan: b.aiScore.dan,
    aiQuan: b.aiScore.quan,
  };
}

function applyDraft(draft: DraftBoard, base: Board): Board {
  const b = base.clone();
  b.cells = [...draft.cells];
  b.quanAliveLeft = draft.quanAliveLeft;
  b.quanAliveRight = draft.quanAliveRight;
  b.playerScore = { dan: draft.playerDan, quan: draft.playerQuan };
  b.aiScore = { dan: draft.aiDan, quan: draft.aiQuan };
  return b;
}

function CellInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
      <input
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0) onChange(v);
        }}
        className="w-12 h-8 text-center text-sm font-mono border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
      />
    </div>
  );
}

function QuanCellInput({
  cellLabel,
  value,
  alive,
  onValueChange,
  onAliveChange,
}: {
  cellLabel: string;
  value: number;
  alive: boolean;
  onValueChange: (v: number) => void;
  onAliveChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-[10px] text-muted-foreground font-mono">{cellLabel}</span>
      <input
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0) onValueChange(v);
        }}
        className="w-12 h-8 text-center text-sm font-mono border border-primary/40 rounded-lg bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
      />
      <label className="flex items-center gap-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={alive}
          onChange={(e) => onAliveChange(e.target.checked)}
          className="w-3 h-3 accent-primary cursor-pointer"
        />
        <span className="text-[10px] text-muted-foreground">còn quan</span>
      </label>
    </div>
  );
}

export function DebugPanel({ board, onBoardChange }: DebugPanelProps) {
  const [draft, setDraft] = useState<DraftBoard>(() => fromBoard(board));

  // When board changes externally (new game, undo, etc.), sync draft
  useEffect(() => {
    setDraft(fromBoard(board));
  }, [board]);

  function update(patch: Partial<DraftBoard>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onBoardChange(applyDraft(next, board));
  }

  function updateCell(idx: number, val: number) {
    const cells = [...draft.cells];
    cells[idx] = val;
    update({ cells });
  }

  // AI pits are displayed right-to-left (mirroring the board: 10,9,8,7,6)
  const aiPitOrder = [10, 9, 8, 7, 6];
  const playerPitOrder = [0, 1, 2, 3, 4];

  return (
    <div className="w-full max-w-2xl mx-auto bg-card rounded-2xl border-2 border-amber-400/60 p-4 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">Debug Mode — Chỉnh bảng</h3>
      </div>

      {/* Board layout */}
      <div className="flex items-center gap-2 mb-4">
        {/* Left quan (QUAN_RIGHT = index 11) */}
        <QuanCellInput
          cellLabel="Ô11 (QP)"
          value={draft.cells[QUAN_RIGHT]}
          alive={draft.quanAliveRight}
          onValueChange={(v) => updateCell(QUAN_RIGHT, v)}
          onAliveChange={(v) => update({ quanAliveRight: v })}
        />

        <div className="flex-1 flex flex-col gap-2">
          {/* AI row (top) */}
          <div className="flex gap-1 justify-center">
            {aiPitOrder.map((idx) => (
              <CellInput
                key={idx}
                label={`Ô${idx} (M)`}
                value={draft.cells[idx]}
                onChange={(v) => updateCell(idx, v)}
              />
            ))}
          </div>

          <div className="w-full h-px bg-border" />

          {/* Player row (bottom) */}
          <div className="flex gap-1 justify-center">
            {playerPitOrder.map((idx) => (
              <CellInput
                key={idx}
                label={`Ô${idx} (B)`}
                value={draft.cells[idx]}
                onChange={(v) => updateCell(idx, v)}
              />
            ))}
          </div>
        </div>

        {/* Right quan (QUAN_LEFT = index 5) */}
        <QuanCellInput
          cellLabel="Ô5 (QT)"
          value={draft.cells[QUAN_LEFT]}
          alive={draft.quanAliveLeft}
          onValueChange={(v) => updateCell(QUAN_LEFT, v)}
          onAliveChange={(v) => update({ quanAliveLeft: v })}
        />
      </div>

      {/* Score editors */}
      <div className="border-t border-border/60 pt-3 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Kho Bạn</span>
          <div className="flex gap-2">
            <CellInput label="Dân" value={draft.playerDan} onChange={(v) => update({ playerDan: v })} />
            <CellInput label="Quan" value={draft.playerQuan} onChange={(v) => update({ playerQuan: v })} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider">Kho Máy</span>
          <div className="flex gap-2">
            <CellInput label="Dân" value={draft.aiDan} onChange={(v) => update({ aiDan: v })} />
            <CellInput label="Quan" value={draft.aiQuan} onChange={(v) => update({ aiQuan: v })} />
          </div>
        </div>

        <div className="ml-auto self-end">
          <button
            onClick={() => setDraft(fromBoard(board))}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Đặt lại về trạng thái hiện tại
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground/70 italic">
        Thay đổi áp dụng ngay lập tức. Tiếp tục chơi bình thường sau khi chỉnh xong.
      </p>
    </div>
  );
}
