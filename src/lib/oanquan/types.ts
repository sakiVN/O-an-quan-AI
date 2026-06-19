export type Player = 0 | 1;

export type Direction = "L" | "R";

export type Move = {
  pit: number;
  direction: Direction;
};

export type ScoreBreakdown = {
  dan: number; // ordinary stones (each worth 1 point)
  quan: number; // captured quan pieces (each worth quanValue points)
};

export type CaptureLog = {
  index: number;
  stones: number; // raw number of stones removed from the pit
  dan: number; // dan added to score
  quan: number; // quan added to score (0 or 1)
  points: number; // total points added (dan + quan * quanValue)
  isQuan: boolean;
};

export type MoveStep =
  | { type: "pickup"; pit: number }
  | { type: "drop"; pit: number }
  | { type: "skip"; pit: number }
  | {
      type: "capture";
      pit: number;
      points: number;
      stones: number;
      dan: number;
      quan: number;
      isQuan: boolean;
    };

export type MoveResult = {
  ok: boolean;
  reason?: string;
  trail: number[];
  captures: CaptureLog[];
  steps: MoveStep[];
  refilled: boolean;
};

export type GameStatus = "playing" | "finished";

// Specific reason why a game ended.
export type EndReason =
  | "quans_captured"        // both ô Quan are empty (natural end of game)
  | "player_no_resources"   // Player can't refill: no dân, no quan
  | "ai_no_resources"       // AI can't refill: no dân, no quan
  | "player_blocked"        // Player needs to sell quan but AI doesn't have enough dân to buy
  | "ai_blocked";           // AI needs to sell quan but Player doesn't have enough dân to buy

// Outcome of trying to refill a side. If ok=false, reason indicates why.
export type RefillResult =
  | { ok: true; quanSold: number }
  | { ok: false; reason: "no_resources" | "opponent_cannot_buy" };

export const TOTAL_CELLS = 12;
export const PLAYER_PITS = [0, 1, 2, 3, 4] as const;
export const AI_PITS = [6, 7, 8, 9, 10] as const;
export const QUAN_LEFT = 5;
export const QUAN_RIGHT = 11;
