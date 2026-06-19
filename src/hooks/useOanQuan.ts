import { useCallback, useEffect, useRef, useState } from "react";
import {
  AIDifficulty,
  findBestMove,
} from "@/lib/oanquan/ai";
import { Board, DEFAULT_QUAN_VALUE, REFILL_COST } from "@/lib/oanquan/board";
import {
  Direction,
  EndReason,
  Move,
  MoveResult,
  Player,
  QUAN_LEFT,
  QUAN_RIGHT,
} from "@/lib/oanquan/types";

export type GameState =
  | "player_turn"
  | "player_needs_refill"
  | "ai_turn"
  | "animating"
  | "game_over";

export type GameOverReason = EndReason;

export type MoveHistoryEntry = {
  player: number; // 0 or 1
  move: Move | null; // null = refill action
  result: MoveResult | null;
  refill?: boolean;
  refillQuanSold?: number;
  boardStateBefore: Board;
};

export type HighlightKind = "pickup" | "drop" | "skip" | "capture" | null;
export type Highlight = { cell: number; kind: HighlightKind } | null;

const AI_DELAY_MS = 600;
const QUAN_VALUE_OPTIONS = [5, 10] as const;
export type QuanValueOption = (typeof QUAN_VALUE_OPTIONS)[number];
export { QUAN_VALUE_OPTIONS };

const ANIM_PICKUP_MS = 220;
const ANIM_DROP_MS = 110;
const ANIM_SKIP_MS = 160;
const ANIM_CAPTURE_FLASH_MS = 280;
const ANIM_CAPTURE_AFTER_MS = 130;
const ANIM_FINAL_PAUSE_MS = 220;

const ANIM_STORAGE_KEY = "oanquan.animationsEnabled";

function loadAnimationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(ANIM_STORAGE_KEY);
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

function saveAnimationsEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANIM_STORAGE_KEY, String(v));
  } catch {
    // ignore
  }
}

function buildBoard(quanValue: number): Board {
  return new Board(undefined, undefined, undefined, true, true, quanValue);
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useOanQuan() {
  const [quanValue, setQuanValueState] = useState<number>(DEFAULT_QUAN_VALUE);
  const [firstPlayer, setFirstPlayerState] = useState<Player>(0);
  const [board, setBoard] = useState<Board>(() => buildBoard(DEFAULT_QUAN_VALUE));
  const [gameState, setGameState] = useState<GameState>("player_turn");
  const [gameOverReason, setGameOverReason] = useState<GameOverReason | null>(
    null,
  );
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [customDepth, setCustomDepth] = useState<number>(5);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const [lastMoveResult, setLastMoveResult] = useState<MoveResult | null>(null);
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() =>
    loadAnimationsEnabled(),
  );
  const [highlight, setHighlight] = useState<Highlight>(null);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTokenRef = useRef(0);

  const cancelAnimation = useCallback(() => {
    animTokenRef.current += 1;
  }, []);

  const setAnimationsEnabled = useCallback((v: boolean) => {
    setAnimationsEnabledState(v);
    saveAnimationsEnabled(v);
  }, []);

  const startNewGame = useCallback(
    (opts?: { quanValue?: number; firstPlayer?: Player }) => {
      const qv = opts?.quanValue ?? quanValue;
      const fp = opts?.firstPlayer ?? firstPlayer;
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      cancelAnimation();
      const fresh = buildBoard(qv);
      setBoard(fresh);
      setQuanValueState(qv);
      setFirstPlayerState(fp);
      setHistory([]);
      setLastMoveResult(null);
      setGameOverReason(null);
      setHighlight(null);
      setGameState(fp === 0 ? "player_turn" : "ai_turn");
    },
    [quanValue, firstPlayer, cancelAnimation],
  );

  const resetGame = useCallback(() => {
    startNewGame();
  }, [startNewGame]);

  const setQuanValue = useCallback(
    (v: number) => {
      startNewGame({ quanValue: v });
    },
    [startNewGame],
  );

  const setFirstPlayer = useCallback(
    (p: Player) => {
      startNewGame({ firstPlayer: p });
    },
    [startNewGame],
  );

  const transitionToTurn = useCallback(
    (nextBoard: Board, player: Player) => {
      // Natural game end: both quan pits are empty.
      if (nextBoard.isGameOver()) {
        const finalBoard = nextBoard.clone();
        finalBoard.settle();
        setBoard(finalBoard);
        setGameOverReason("quans_captured");
        setGameState("game_over");
        return;
      }
      // Side empty: check if player can refill (with quan-selling fallback).
      const reason = nextBoard.endReasonForTurn(player);
      if (reason !== null) {
        const finalBoard = nextBoard.clone();
        finalBoard.settle();
        setBoard(finalBoard);
        setGameOverReason(reason);
        setGameState("game_over");
        return;
      }
      if (player === 0) {
        if (nextBoard.ownSideEmpty(0)) {
          setGameState("player_needs_refill");
        } else {
          setGameState("player_turn");
        }
      } else {
        setGameState("ai_turn");
      }
    },
    [],
  );

  // Walk through MoveResult.steps with delays, mutating a working board snapshot.
  // When done (or cancelled), invokes onDone(finalBoard).
  const animateMove = useCallback(
    async (
      boardBefore: Board,
      result: MoveResult,
      finalBoard: Board,
      player: Player,
      onDone: () => void,
    ) => {
      const token = ++animTokenRef.current;
      const isCancelled = () => animTokenRef.current !== token;

      const working = boardBefore.clone();
      setBoard(working.clone());
      setHighlight(null);
      await wait(40);
      if (isCancelled()) return;

      for (const step of result.steps) {
        if (isCancelled()) return;
        if (step.type === "pickup") {
          working.cells[step.pit] = 0;
          setBoard(working.clone());
          setHighlight({ cell: step.pit, kind: "pickup" });
          await wait(ANIM_PICKUP_MS);
        } else if (step.type === "drop") {
          working.cells[step.pit] += 1;
          setBoard(working.clone());
          setHighlight({ cell: step.pit, kind: "drop" });
          await wait(ANIM_DROP_MS);
        } else if (step.type === "skip") {
          setHighlight({ cell: step.pit, kind: "skip" });
          await wait(ANIM_SKIP_MS);
        } else if (step.type === "capture") {
          setHighlight({ cell: step.pit, kind: "capture" });
          await wait(ANIM_CAPTURE_FLASH_MS);
          if (isCancelled()) return;
          working.cells[step.pit] = 0;
          if (step.isQuan) {
            if (step.pit === QUAN_LEFT) working.quanAliveLeft = false;
            if (step.pit === QUAN_RIGHT) working.quanAliveRight = false;
          }
          const target = player === 0 ? working.playerScore : working.aiScore;
          target.dan += step.dan;
          target.quan += step.quan;
          setBoard(working.clone());
          await wait(ANIM_CAPTURE_AFTER_MS);
        }
      }

      if (isCancelled()) return;
      setBoard(finalBoard);
      await wait(ANIM_FINAL_PAUSE_MS);
      if (isCancelled()) return;
      setHighlight(null);
      onDone();
    },
    [],
  );

  const undoMove = useCallback(() => {
    if (gameState === "animating" || gameState === "ai_turn") return;
    if (history.length === 0) return;

    let lastPlayerIdx = history.length - 1;
    while (lastPlayerIdx >= 0 && history[lastPlayerIdx].player !== 0) {
      lastPlayerIdx--;
    }
    if (lastPlayerIdx < 0) return;

    const entry = history[lastPlayerIdx];
    const restored = entry.boardStateBefore.clone();
    cancelAnimation();
    setHighlight(null);
    setBoard(restored);
    setHistory((h) => h.slice(0, lastPlayerIdx));
    setLastMoveResult(null);
    setGameOverReason(null);
    transitionToTurn(restored, 0);
  }, [gameState, history, transitionToTurn, cancelAnimation]);

  const refillPlayer = useCallback(() => {
    if (gameState !== "player_needs_refill") return;
    const boardBefore = board.clone();
    const next = board.clone();
    const r = next.tryRefill(0);
    if (!r.ok) return;
    setHistory((h) => [
      ...h,
      {
        player: 0,
        move: null,
        result: null,
        refill: true,
        refillQuanSold: r.quanSold,
        boardStateBefore: boardBefore,
      },
    ]);
    setBoard(next);
    setGameState("player_turn");
  }, [board, gameState]);

  const makePlayerMove = useCallback(
    (pit: number, direction: Direction) => {
      if (gameState !== "player_turn") return false;

      const boardBefore = board.clone();
      const finalBoard = board.clone();
      const move = { pit, direction };
      const result = finalBoard.makeMove(0, move);

      if (!result.ok) return false;

      setHistory((h) => [
        ...h,
        { player: 0, move, result, boardStateBefore: boardBefore },
      ]);
      setLastMoveResult(result);
      setGameState("animating");

      if (animationsEnabled) {
        void animateMove(boardBefore, result, finalBoard, 0, () => {
          transitionToTurn(finalBoard, 1);
        });
      } else {
        setBoard(finalBoard);
        transitionToTurn(finalBoard, 1);
      }

      return true;
    },
    [board, gameState, transitionToTurn, animationsEnabled, animateMove],
  );

  const triggerAITurn = useCallback(() => {
    if (gameState !== "ai_turn") return;

    aiTimerRef.current = setTimeout(() => {
      const boardBefore = board.clone();
      let working = board;

      if (working.ownSideEmpty(1)) {
        const reason = working.endReasonForTurn(1);
        if (reason !== null) {
          const finalBoard = working.clone();
          finalBoard.settle();
          setBoard(finalBoard);
          setGameOverReason(reason);
          setGameState("game_over");
          return;
        }
        const refilled = working.clone();
        const r = refilled.tryRefill(1);
        if (!r.ok) {
          // Should not happen since endReasonForTurn returned null, but be safe.
          const finalBoard = working.clone();
          finalBoard.settle();
          setBoard(finalBoard);
          setGameOverReason("ai_no_resources");
          setGameState("game_over");
          return;
        }
        working = refilled;
        setBoard(working);
        setHistory((h) => [
          ...h,
          {
            player: 1,
            move: null,
            result: null,
            refill: true,
            refillQuanSold: r.quanSold,
            boardStateBefore: boardBefore,
          },
        ]);
      }

      const search = findBestMove(working, difficulty, customDepth);
      if (!search.move) {
        transitionToTurn(working, 0);
        return;
      }

      const beforeMove = working.clone();
      const finalBoard = working.clone();
      const result = finalBoard.makeMove(1, search.move);
      if (!result.ok) {
        transitionToTurn(working, 0);
        return;
      }

      setHistory((h) => [
        ...h,
        {
          player: 1,
          move: search.move,
          result,
          boardStateBefore: beforeMove,
        },
      ]);
      setLastMoveResult(result);
      setGameState("animating");

      if (animationsEnabled) {
        void animateMove(beforeMove, result, finalBoard, 1, () => {
          transitionToTurn(finalBoard, 0);
        });
      } else {
        setBoard(finalBoard);
        transitionToTurn(finalBoard, 0);
      }
    }, AI_DELAY_MS);
  }, [
    board,
    difficulty,
    gameState,
    transitionToTurn,
    animationsEnabled,
    animateMove,
  ]);

  useEffect(() => {
    if (gameState === "ai_turn") {
      triggerAITurn();
    }
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [gameState, triggerAITurn]);

  const debugSetBoard = useCallback(
    (b: Board) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      cancelAnimation();
      setHighlight(null);
      setBoard(b.clone());
    },
    [cancelAnimation],
  );

  return {
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
    lastMoveResult,
    refillCost: REFILL_COST,
    debugSetBoard,
  };
}
