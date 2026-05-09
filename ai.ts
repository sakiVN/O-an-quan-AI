import { Board } from "./board";
import { Move, Player } from "./types";

export type AIDifficulty = "easy" | "medium" | "hard";

const DEPTH_BY_DIFFICULTY: Record<AIDifficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

export type SearchResult = {
  move: Move | null;
  score: number;
  nodes: number;
  elapsedMs: number;
  refilledFirst: boolean;
};

function evaluate(board: Board): number {
  const stoneAdvantage = board.sumOwnSide(1) * 0.2 - board.sumOwnSide(0) * 0.2;
  return board.totalPoints(1) - board.totalPoints(0) + stoneAdvantage;
}

function terminalScore(board: Board): number {
  const clone = board.clone();
  clone.settle();
  return clone.totalPoints(1) - clone.totalPoints(0);
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  counter: { nodes: number },
): number {
  counter.nodes += 1;

  if (board.isGameOver()) return terminalScore(board);
  if (depth === 0) return evaluate(board);

  const player: Player = maximizing ? 1 : 0;

  // If side is empty, the player must refill (cost 5) or lose if insufficient
  if (board.ownSideEmpty(player)) {
    if (!board.canContinue(player)) {
      // Player loses: settle now and return final score
      return terminalScore(board);
    }
    const refilled = board.clone();
    refilled.refill(player);
    return minimax(refilled, depth - 1, alpha, beta, maximizing, counter);
  }

  const moves = board.getValidMoves(player);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = board.clone();
      next.makeMove(player, move);
      const score = minimax(next, depth - 1, alpha, beta, false, counter);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = board.clone();
      next.makeMove(player, move);
      const score = minimax(next, depth - 1, alpha, beta, true, counter);
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function findBestMove(
  board: Board,
  difficulty: AIDifficulty = "medium",
): SearchResult {
  const depth = DEPTH_BY_DIFFICULTY[difficulty];
  const start = performance.now();
  const counter = { nodes: 0 };

  let working = board;
  let refilledFirst = false;

  if (working.ownSideEmpty(1)) {
    if (!working.canContinue(1)) {
      return {
        move: null,
        score: 0,
        nodes: 0,
        elapsedMs: performance.now() - start,
        refilledFirst: false,
      };
    }
    const refilled = working.clone();
    refilled.refill(1);
    working = refilled;
    refilledFirst = true;
  }

  let bestScore = -Infinity;
  let bestMove: Move | null = null;
  let alpha = -Infinity;
  const beta = Infinity;

  const moves = working.getValidMoves(1);
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    const next = working.clone();
    next.makeMove(1, move);
    const score = minimax(next, depth - 1, alpha, beta, false, counter);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (bestScore > alpha) alpha = bestScore;
  }

  return {
    move: bestMove,
    score: bestScore,
    nodes: counter.nodes,
    elapsedMs: performance.now() - start,
    refilledFirst,
  };
}
