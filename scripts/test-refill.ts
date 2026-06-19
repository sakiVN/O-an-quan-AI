// Quick verification tests for the new dan/quan score model and refill rule.
// Run with: pnpm --filter o-an-quan exec tsx scripts/test-refill.ts
import { Board, REFILL_COST } from "../src/lib/oanquan/board";
import {
  AI_PITS,
  PLAYER_PITS,
  QUAN_LEFT,
  QUAN_RIGHT,
} from "../src/lib/oanquan/types";

let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}\n       ${(e as Error).message}`);
  }
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}
function eq<T>(actual: T, expected: T, label = "") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// Helpers to make a board with custom cells/scores.
function makeBoard(cells: number[], opts?: {
  playerDan?: number;
  playerQuan?: number;
  aiDan?: number;
  aiQuan?: number;
  quanAliveLeft?: boolean;
  quanAliveRight?: boolean;
  quanValue?: number;
}) {
  return new Board(
    cells,
    { dan: opts?.playerDan ?? 0, quan: opts?.playerQuan ?? 0 },
    { dan: opts?.aiDan ?? 0, quan: opts?.aiQuan ?? 0 },
    opts?.quanAliveLeft ?? true,
    opts?.quanAliveRight ?? true,
    opts?.quanValue ?? 5,
  );
}

console.log("\n== Score model & refill ==");

test("totalPoints uses dan + quan*quanValue", () => {
  const b = makeBoard(Board.initialCells(), {
    playerDan: 3,
    playerQuan: 2,
    aiDan: 1,
    aiQuan: 1,
    quanValue: 5,
  });
  eq(b.totalPoints(0), 13, "player total");
  eq(b.totalPoints(1), 6, "ai total");
});

test("refill with enough dan: spends 5 dan, sows 1 stone per pit", () => {
  // empty player side, give them dan
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  const b = makeBoard(cells, { playerDan: 7, quanValue: 5 });
  const r = b.tryRefill(0);
  assert(r.ok, "refill should succeed");
  if (r.ok) eq(r.quanSold, 0, "quan sold");
  eq(b.playerScore.dan, 2, "remaining dan");
  for (const p of PLAYER_PITS) eq(b.cells[p], 1, `pit ${p}`);
});

test("refill sells 1 quan to opponent when dan < 5 (5-dan ratio)", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  // Player: 0 dan, 1 quan. AI: 10 dan available to "buy".
  const b = makeBoard(cells, {
    playerDan: 0,
    playerQuan: 1,
    aiDan: 10,
    aiQuan: 0,
    quanValue: 5,
  });
  const r = b.tryRefill(0);
  assert(r.ok, "refill should succeed by selling 1 quan");
  if (r.ok) eq(r.quanSold, 1, "quan sold");
  // After sale: player gained 5 dan, then spent 5 dan refilling -> 0 dan left.
  eq(b.playerScore.dan, 0, "player dan after refill");
  eq(b.playerScore.quan, 0, "player quan after sale");
  // AI received 1 quan and lost 5 dan.
  eq(b.aiScore.dan, 5, "ai dan after sale");
  eq(b.aiScore.quan, 1, "ai quan after sale");
  for (const p of PLAYER_PITS) eq(b.cells[p], 1, `pit ${p}`);
});

test("refill sells multiple quan when dan deficit > quanValue (10-dan ratio, dan=0)", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  // Player has 0 dan, 2 quan. With quanValue=10, 1 quan should be enough (10 dan -> spend 5).
  const b = makeBoard(cells, {
    playerDan: 0,
    playerQuan: 2,
    aiDan: 20,
    quanValue: 10,
  });
  const r = b.tryRefill(0);
  assert(r.ok, "refill should succeed");
  if (r.ok) eq(r.quanSold, 1, "quan sold (only 1 needed at 10-dan ratio)");
  eq(b.playerScore.dan, 5, "player dan = 10 - 5");
  eq(b.playerScore.quan, 1, "player quan");
  eq(b.aiScore.dan, 10, "ai dan = 20 - 10");
  eq(b.aiScore.quan, 1, "ai quan");
});

test("refill fails with no_resources when no dan and no quan", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  const b = makeBoard(cells, { playerDan: 2, playerQuan: 0, aiDan: 50 });
  const r = b.tryRefill(0);
  assert(!r.ok, "refill should fail");
  if (!r.ok) eq(r.reason, "no_resources", "reason");
  // State should be unchanged on failure -- verify a snapshot.
  // (Note: tryRefill mutates own.dan progressively only when the loop succeeds.
  // But our check returns BEFORE mutating dan, so verify dan/quan are intact.)
  eq(b.playerScore.dan, 2, "dan unchanged");
});

test("refill fails with opponent_cannot_buy when AI lacks dan", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  const b = makeBoard(cells, {
    playerDan: 0,
    playerQuan: 3,
    aiDan: 2, // less than quanValue=5
    quanValue: 5,
  });
  const r = b.tryRefill(0);
  assert(!r.ok, "refill should fail");
  if (!r.ok) eq(r.reason, "opponent_cannot_buy", "reason");
});

test("canContinue does not mutate the board", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  const b = makeBoard(cells, { playerDan: 0, playerQuan: 1, aiDan: 10 });
  const before = JSON.stringify({
    cells: b.cells,
    p: b.playerScore,
    a: b.aiScore,
  });
  const can = b.canContinue(0);
  eq(can, true, "can continue via selling quan");
  const after = JSON.stringify({
    cells: b.cells,
    p: b.playerScore,
    a: b.aiScore,
  });
  eq(after, before, "no mutation");
});

console.log("\n== End reasons ==");

test("endReasonForTurn returns null when side non-empty", () => {
  const b = new Board();
  eq(b.endReasonForTurn(0), null);
});

test("endReasonForTurn = quans_captured when both quan pits empty", () => {
  const cells = new Array(12).fill(0);
  cells[0] = 3; // player has stones, but quan pits both 0
  const b = makeBoard(cells, { quanAliveLeft: false, quanAliveRight: false });
  eq(b.endReasonForTurn(0), "quans_captured");
});

test("endReasonForTurn = player_no_resources", () => {
  const cells = Board.initialCells();
  for (const p of PLAYER_PITS) cells[p] = 0;
  const b = makeBoard(cells, { playerDan: 0, playerQuan: 0, aiDan: 100 });
  eq(b.endReasonForTurn(0), "player_no_resources");
});

test("endReasonForTurn = ai_blocked", () => {
  const cells = Board.initialCells();
  for (const p of AI_PITS) cells[p] = 0;
  const b = makeBoard(cells, {
    playerDan: 1, // less than quanValue=5
    aiDan: 0,
    aiQuan: 2,
    quanValue: 5,
  });
  eq(b.endReasonForTurn(1), "ai_blocked");
});

console.log("\n== Capture: dan/quan accounting ==");

test("capturing a quan-alive pit gives 1 quan + (n-1) dan", () => {
  // Set up player playing pit 4 right with 1 stone, lands at QUAN_LEFT(5).
  // Sowing 1 stone from pit 4 R: lands on pit 5 (quan). Sow ends at quan -> stop, no capture.
  // Build a custom scenario: player plays pit 3 R with 2 stones -> lands on 4 then 5 (quan).
  // Stops at quan. Use a different setup: pit 4 has 1, R -> drop on 5 (quan), stop.
  // Better: put a setup where capture chain hits a quan.
  // pit 3 has 1 stone, direction R. Drop on 4. nextCell = 5 (quan).
  // is quan -> stop. No capture.
  //
  // To force capture of QUAN_LEFT, we need a non-quan empty cell as the "skip"
  // entry. Then probe wraps around. Easier: set up so chain steps INTO quan
  // pit during walk.
  // pit 2 R with 1 stone -> drops on 3. nextCell=4. cells[4]=0 (empty, non-quan).
  // Skip 4, captureCell=5(quan with 7 stones, alive).
  const cells = new Array(12).fill(0);
  cells[2] = 1;
  cells[4] = 0;
  cells[QUAN_LEFT] = 7; // 1 quan + 6 dan worth
  const b = makeBoard(cells, { quanValue: 5 });
  const r = b.makeMove(0, { pit: 2, direction: "R" });
  assert(r.ok, "move ok");
  eq(r.captures.length, 1, "one capture");
  const cap = r.captures[0];
  eq(cap.index, QUAN_LEFT, "captured quan_left");
  eq(cap.dan, 6, "dan from quan capture");
  eq(cap.quan, 1, "quan stone counted");
  eq(cap.points, 6 + 1 * 5, "points");
  eq(b.playerScore.dan, 6, "score dan");
  eq(b.playerScore.quan, 1, "score quan");
  eq(b.quanAliveLeft, false, "quan dead");
});

test("capturing an ordinary pit gives only dan", () => {
  const cells = new Array(12).fill(0);
  cells[2] = 1;
  cells[4] = 3; // capture target after skipping pit 3
  // pit 2 R with 1 -> drops on 3. nextCell=4 (non-quan, has stones) -> continue sowing!
  // We need an empty cell at 3 (skip) and stones at 4 (capture).
  // pit 1 R with 1 -> drops on 2. nextCell=3 (empty, non-quan) -> enter chain.
  // probe=3, skip. captureCell=4 (3 stones).
  cells[1] = 1;
  cells[2] = 0;
  cells[3] = 0;
  cells[4] = 3;
  const b = makeBoard(cells, { quanValue: 5 });
  const r = b.makeMove(0, { pit: 1, direction: "R" });
  assert(r.ok, "move ok");
  eq(r.captures.length, 1, "one capture");
  eq(r.captures[0].dan, 3, "dan");
  eq(r.captures[0].quan, 0, "no quan");
  eq(b.playerScore.dan, 3, "dan");
  eq(b.playerScore.quan, 0, "quan");
});

test("settle: dead quan pit leftover stones go as dan, alive quan adds 1 quan", () => {
  const cells = new Array(12).fill(0);
  cells[QUAN_LEFT] = 3; // alive
  cells[QUAN_RIGHT] = 4; // dead (no quan piece, just stranded dan)
  cells[0] = 2; // player side
  cells[7] = 5; // ai side
  const b = makeBoard(cells, {
    quanAliveLeft: true,
    quanAliveRight: false,
    quanValue: 5,
  });
  b.settle();
  // QUAN_LEFT(5 alive) -> AI side gain: 1 quan + 2 dan.
  // QUAN_RIGHT(11 dead) -> player gain: 4 dan.
  eq(b.playerScore.dan, 2 + 4, "player dan");
  eq(b.playerScore.quan, 0, "player quan");
  eq(b.aiScore.dan, 5 + 2, "ai dan");
  eq(b.aiScore.quan, 1, "ai quan");
  for (let i = 0; i < 12; i++) eq(b.cells[i], 0, `cell ${i} cleared`);
});

console.log(`\n${failed === 0 ? "All tests passed." : `${failed} test(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
