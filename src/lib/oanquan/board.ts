import {
  AI_PITS,
  CaptureLog,
  Direction,
  EndReason,
  Move,
  MoveResult,
  MoveStep,
  PLAYER_PITS,
  Player,
  QUAN_LEFT,
  QUAN_RIGHT,
  RefillResult,
  ScoreBreakdown,
  TOTAL_CELLS,
} from "./types";

export const REFILL_COST = 5;
export const DEFAULT_QUAN_VALUE = 5;

function emptyScore(): ScoreBreakdown {
  return { dan: 0, quan: 0 };
}

function cloneScore(s: ScoreBreakdown): ScoreBreakdown {
  return { dan: s.dan, quan: s.quan };
}

export class Board {
  cells: number[];
  playerScore: ScoreBreakdown;
  aiScore: ScoreBreakdown;
  // Whether the original "quan" stone is still in pit 5/11
  quanAliveLeft: boolean;
  quanAliveRight: boolean;
  // How many points one captured "quan" stone is worth
  quanValue: number;

  constructor(
    cells?: number[],
    playerScore: ScoreBreakdown = emptyScore(),
    aiScore: ScoreBreakdown = emptyScore(),
    quanAliveLeft = true,
    quanAliveRight = true,
    quanValue: number = DEFAULT_QUAN_VALUE,
  ) {
    this.cells = cells ? [...cells] : Board.initialCells();
    this.playerScore = cloneScore(playerScore);
    this.aiScore = cloneScore(aiScore);
    this.quanAliveLeft = quanAliveLeft;
    this.quanAliveRight = quanAliveRight;
    this.quanValue = quanValue;
  }

  static initialCells(): number[] {
    const cells = new Array<number>(TOTAL_CELLS).fill(0);
    for (const i of PLAYER_PITS) cells[i] = 5;
    for (const i of AI_PITS) cells[i] = 5;
    cells[QUAN_LEFT] = 1;
    cells[QUAN_RIGHT] = 1;
    return cells;
  }

  clone(): Board {
    return new Board(
      this.cells,
      this.playerScore,
      this.aiScore,
      this.quanAliveLeft,
      this.quanAliveRight,
      this.quanValue,
    );
  }

  isPlayerSide(idx: number): boolean {
    return idx >= 0 && idx <= 4;
  }

  isAiSide(idx: number): boolean {
    return idx >= 6 && idx <= 10;
  }

  isQuan(idx: number): boolean {
    return idx === QUAN_LEFT || idx === QUAN_RIGHT;
  }

  isQuanAlive(idx: number): boolean {
    if (idx === QUAN_LEFT) return this.quanAliveLeft;
    if (idx === QUAN_RIGHT) return this.quanAliveRight;
    return false;
  }

  ownerOfPit(idx: number): Player | null {
    if (this.isPlayerSide(idx)) return 0;
    if (this.isAiSide(idx)) return 1;
    return null;
  }

  validPits(player: Player): number[] {
    const pits = player === 0 ? PLAYER_PITS : AI_PITS;
    return pits.filter((p) => this.cells[p] > 0);
  }

  getValidMoves(player: Player): Move[] {
    const moves: Move[] = [];
    for (const pit of this.validPits(player)) {
      moves.push({ pit, direction: "L" });
      moves.push({ pit, direction: "R" });
    }
    return moves;
  }

  ownSideEmpty(player: Player): boolean {
    const pits = player === 0 ? PLAYER_PITS : AI_PITS;
    return pits.every((p) => this.cells[p] === 0);
  }

  scoreOf(player: Player): ScoreBreakdown {
    return player === 0 ? this.playerScore : this.aiScore;
  }

  // Total points for a player (dan + quan * quanValue).
  totalPoints(player: Player): number {
    const s = this.scoreOf(player);
    return s.dan + s.quan * this.quanValue;
  }

  // Try to refill a player's empty side, selling quan to opponent at the
  // configured ratio (1 quan = quanValue dan) when own dan is insufficient.
  // Returns ok=true with how many quan were sold, or ok=false with reason.
  tryRefill(player: Player): RefillResult {
    const own = this.scoreOf(player);
    const opp = this.scoreOf((1 - player) as Player);

    let quanSold = 0;
    while (own.dan < REFILL_COST) {
      if (own.quan < 1) {
        return { ok: false, reason: "no_resources" };
      }
      if (opp.dan < this.quanValue) {
        return { ok: false, reason: "opponent_cannot_buy" };
      }
      // Sell 1 quan to opponent: opp pays quanValue dan and receives the quan.
      own.quan -= 1;
      own.dan += this.quanValue;
      opp.quan += 1;
      opp.dan -= this.quanValue;
      quanSold += 1;
    }

    own.dan -= REFILL_COST;
    const pits = player === 0 ? PLAYER_PITS : AI_PITS;
    for (const p of pits) this.cells[p] += 1;
    return { ok: true, quanSold };
  }

  // Backward-compatible boolean refill (true/false). Spends 5 dan with quan-selling fallback.
  refill(player: Player): boolean {
    return this.tryRefill(player).ok;
  }

  needsRefill(player: Player): boolean {
    if (this.isGameOver()) return false;
    return this.ownSideEmpty(player);
  }

  // Can the given player keep playing? (Either side non-empty, or refill succeeds.)
  canContinue(player: Player): boolean {
    if (!this.ownSideEmpty(player)) return true;
    // Simulate the refill against a clone to avoid mutating state.
    const clone = this.clone();
    return clone.tryRefill(player).ok;
  }

  // Why would the game end if it ended right now? Returns null if not ended.
  endReasonForTurn(playerToAct: Player): EndReason | null {
    if (this.isGameOver()) return "quans_captured";
    if (!this.ownSideEmpty(playerToAct)) return null;
    const clone = this.clone();
    const r = clone.tryRefill(playerToAct);
    if (r.ok) return null;
    if (r.reason === "no_resources") {
      return playerToAct === 0 ? "player_no_resources" : "ai_no_resources";
    }
    return playerToAct === 0 ? "player_blocked" : "ai_blocked";
  }

  // Game over: both quan pits are completely empty (no quan stone, no scattered dân).
  isGameOver(): boolean {
    return this.cells[QUAN_LEFT] === 0 && this.cells[QUAN_RIGHT] === 0;
  }

  sumOwnSide(player: Player): number {
    const pits = player === 0 ? PLAYER_PITS : AI_PITS;
    return pits.reduce((s, p) => s + this.cells[p], 0);
  }

  // Convert raw stones in a pit to (dan, quan) when captured.
  // Returns the dan count and quan count to add to the captor's score.
  private capturedFromPit(idx: number, stones: number): { dan: number; quan: number } {
    if (stones <= 0) return { dan: 0, quan: 0 };
    if (this.isQuan(idx) && this.isQuanAlive(idx)) {
      // 1 quan stone + (stones - 1) dan stones
      return { dan: stones - 1, quan: 1 };
    }
    return { dan: stones, quan: 0 };
  }

  // Final settlement: each side collects remaining stones on their side.
  // Stranded stones in dead/leftover quan pits go to the adjacent side
  // (left quan -> AI side, right quan -> player side).
  // All collected stones become dân (since the quan pieces still on the
  // board are accounted for via quanAlive flags).
  settle(): void {
    const playerGain = emptyScore();
    const aiGain = emptyScore();

    for (const i of PLAYER_PITS) {
      playerGain.dan += this.cells[i];
      this.cells[i] = 0;
    }
    for (const i of AI_PITS) {
      aiGain.dan += this.cells[i];
      this.cells[i] = 0;
    }
    if (this.cells[QUAN_LEFT] > 0) {
      const captured = this.capturedFromPit(QUAN_LEFT, this.cells[QUAN_LEFT]);
      aiGain.dan += captured.dan;
      aiGain.quan += captured.quan;
      this.cells[QUAN_LEFT] = 0;
      this.quanAliveLeft = false;
    }
    if (this.cells[QUAN_RIGHT] > 0) {
      const captured = this.capturedFromPit(QUAN_RIGHT, this.cells[QUAN_RIGHT]);
      playerGain.dan += captured.dan;
      playerGain.quan += captured.quan;
      this.cells[QUAN_RIGHT] = 0;
      this.quanAliveRight = false;
    }
    this.playerScore.dan += playerGain.dan;
    this.playerScore.quan += playerGain.quan;
    this.aiScore.dan += aiGain.dan;
    this.aiScore.quan += aiGain.quan;
  }

  private nextIndex(idx: number, dir: Direction): number {
    if (dir === "R") return (idx + 1) % TOTAL_CELLS;
    return (idx - 1 + TOTAL_CELLS) % TOTAL_CELLS;
  }

  private addScore(player: Player, dan: number, quan: number): void {
    const s = this.scoreOf(player);
    s.dan += dan;
    s.quan += quan;
  }

  // Apply a move. Does NOT auto-refill; caller must ensure side is non-empty.
  makeMove(player: Player, move: Move): MoveResult {
    const trail: number[] = [];
    const captures: CaptureLog[] = [];
    const steps: MoveStep[] = [];
    const result: MoveResult = {
      ok: false,
      trail,
      captures,
      steps,
      refilled: false,
    };

    const { pit, direction } = move;

    if (pit < 0 || pit >= TOTAL_CELLS) {
      result.reason = "Ô không hợp lệ";
      return result;
    }
    if (this.isQuan(pit)) {
      result.reason = "Không được rải từ ô quan";
      return result;
    }
    const owner = this.ownerOfPit(pit);
    if (owner !== player) {
      result.reason = "Không phải ô của bạn";
      return result;
    }
    if (this.cells[pit] === 0) {
      result.reason = "Ô trống";
      return result;
    }

    let current = pit;
    let stones = this.cells[current];
    this.cells[current] = 0;
    steps.push({ type: "pickup", pit: current });

    while (true) {
      // Sow stones one by one
      while (stones > 0) {
        current = this.nextIndex(current, direction);
        this.cells[current] += 1;
        trail.push(current);
        steps.push({ type: "drop", pit: current });
        stones -= 1;
      }

      const nextCell = this.nextIndex(current, direction);

      // Continue sowing if next cell is a non-quan with stones
      if (!this.isQuan(nextCell) && this.cells[nextCell] > 0) {
        current = nextCell;
        stones = this.cells[current];
        this.cells[current] = 0;
        steps.push({ type: "pickup", pit: current });
        continue;
      }

      // Capture chain when next cell is empty (must be a non-quan empty pit
      // to ENTER the chain — sowing ending right before a quan = lose turn).
      if (!this.isQuan(nextCell) && this.cells[nextCell] === 0) {
        // Walk the chain: alternating empty cell (skip) and non-empty cell
        // (capture). Inside the chain we treat quan pits like any other
        // pit — empty quan acts as a skip, quan with stones is captured
        // (with quan bonus if still alive), and the chain may continue
        // past it.
        let probe = nextCell;
        steps.push({ type: "skip", pit: probe });

        // Safety bound: at most TOTAL_CELLS iterations to avoid infinite
        // loops in degenerate cases.
        for (let safety = 0; safety < TOTAL_CELLS; safety++) {
          const captureCell = this.nextIndex(probe, direction);

          // Two empty cells in a row (regardless of quan or ordinary) -> stop
          if (this.cells[captureCell] === 0) {
            break;
          }

          // Capture the cell (ordinary or quan with stones)
          const taken = this.cells[captureCell];
          const tookQuan =
            this.isQuan(captureCell) && this.isQuanAlive(captureCell);
          const { dan: capDan, quan: capQuan } = this.capturedFromPit(
            captureCell,
            taken,
          );
          const points = capDan + capQuan * this.quanValue;
          this.cells[captureCell] = 0;
          if (tookQuan) {
            if (captureCell === QUAN_LEFT) this.quanAliveLeft = false;
            if (captureCell === QUAN_RIGHT) this.quanAliveRight = false;
          }
          this.addScore(player, capDan, capQuan);
          captures.push({
            index: captureCell,
            stones: taken,
            dan: capDan,
            quan: capQuan,
            points,
            isQuan: tookQuan,
          });
          steps.push({
            type: "capture",
            pit: captureCell,
            points,
            stones: taken,
            dan: capDan,
            quan: capQuan,
            isQuan: tookQuan,
          });

          // Look at the next "skip" cell. If it has stones -> chain stops.
          probe = this.nextIndex(captureCell, direction);
          if (this.cells[probe] !== 0) {
            break;
          }
          steps.push({ type: "skip", pit: probe });
        }
        break;
      }

      // If next cell is a quan, we can still enter capture mode when it's empty.
      // This supports the immediate-capture case after landing on an empty pit
      // before a quan (e.g. ... -> ô 0 trống -> ô quan -> ô 10).
      if (this.isQuan(nextCell)) {
        if (this.cells[nextCell] === 0) {
          let probe = nextCell;
          steps.push({ type: "skip", pit: probe });

          for (let safety = 0; safety < TOTAL_CELLS; safety++) {
            const captureCell = this.nextIndex(probe, direction);
            if (this.cells[captureCell] === 0) {
              break;
            }

            const taken = this.cells[captureCell];
            const tookQuan =
              this.isQuan(captureCell) && this.isQuanAlive(captureCell);
            const { dan: capDan, quan: capQuan } = this.capturedFromPit(
              captureCell,
              taken,
            );
            const points = capDan + capQuan * this.quanValue;
            this.cells[captureCell] = 0;
            if (tookQuan) {
              if (captureCell === QUAN_LEFT) this.quanAliveLeft = false;
              if (captureCell === QUAN_RIGHT) this.quanAliveRight = false;
            }
            this.addScore(player, capDan, capQuan);
            captures.push({
              index: captureCell,
              stones: taken,
              dan: capDan,
              quan: capQuan,
              points,
              isQuan: tookQuan,
            });
            steps.push({
              type: "capture",
              pit: captureCell,
              points,
              stones: taken,
              dan: capDan,
              quan: capQuan,
              isQuan: tookQuan,
            });

            probe = this.nextIndex(captureCell, direction);
            if (this.cells[probe] !== 0) {
              break;
            }
            steps.push({ type: "skip", pit: probe });
          }
        }
        break;
      }
    }

    result.ok = true;
    return result;
  }

  totalStonesOnBoard(): number {
    return this.cells.reduce((s, c) => s + c, 0);
  }
}
