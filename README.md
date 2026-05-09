# O-an-quan-AI

Using an AI to make you feel bad when playing this game...

## Giới thiệu

Hiện tại project mới upload phần core, bao gồm 3 thành phần chính:

* `Board` — quản lý trạng thái bàn cờ và logic trò chơi.
* `Types` — chứa các định nghĩa kiểu dữ liệu.
* `AI` — cài đặt BOT sử dụng thuật toán **Minimax kết hợp Alpha-Beta Pruning**.

---

# Thuật toán AI sử dụng cho BOT trong Ô ĂN QUAN

Trong đề tài, BOT được xây dựng dựa trên thuật toán **Minimax** kết hợp với **Alpha-Beta Pruning**.

Thuật toán Minimax cho phép BOT:

* Mô phỏng các nước đi có thể xảy ra.
* Dự đoán phản ứng của người chơi.
* Đánh giá trạng thái bàn cờ.
* Từ đó lựa chọn nước đi tối ưu nhất.

Trong quá trình hoạt động:

* BOT đóng vai trò **MAX** (tối đa hóa lợi thế).
* Người chơi đóng vai trò **MIN** (giảm lợi thế của BOT).

---

# Quá trình xử lý của AI

## BƯỚC 1: Xác định độ khó của BOT

Hệ thống hỗ trợ 3 mức độ khó khác nhau thông qua việc thay đổi độ sâu tìm kiếm của thuật toán Minimax.

```ts
export type AIDifficulty = "easy" | "medium" | "hard";

const DEPTH_BY_DIFFICULTY: Record<AIDifficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};
```

Các chế độ:

* **Easy**: BOT chỉ phân tích trước 1 bước đi.
* **Medium**: BOT phân tích trước 3 bước đi.
* **Hard**: BOT phân tích trước 5 bước đi.

Độ sâu càng lớn:

* BOT càng thông minh.
* Thời gian xử lý càng tăng.

---

## BƯỚC 2: Đánh giá trạng thái bàn cờ

Sau khi mô phỏng các nước đi, BOT cần đánh giá trạng thái hiện tại của bàn cờ thông qua hàm `evaluate()`.

```ts
function evaluate(board: Board): number {
  const stoneAdvantage =
    board.sumOwnSide(1) * 0.2 - board.sumOwnSide(0) * 0.2;

  return (
    board.totalPoints(1) -
    board.totalPoints(0) +
    stoneAdvantage
  );
}
```

Hàm đánh giá dựa trên:

* Tổng điểm của BOT.
* Tổng điểm của người chơi.
* Số quân còn lại phía BOT.
* Số quân còn lại phía người chơi.

Giá trị trả về càng lớn thì BOT càng có lợi thế.

---

## BƯỚC 3: Bắt đầu thuật toán Minimax

Thuật toán chính được cài đặt trong hàm:

```ts
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  counter: { nodes: number },
): number
```

### Các tham số:

* `board`: trạng thái bàn cờ hiện tại.
* `depth`: độ sâu tìm kiếm.
* `alpha`, `beta`: dùng cho Alpha-Beta Pruning.
* `maximizing`: xác định lượt BOT hay người chơi.
* `counter`: đếm số node đã duyệt.

### Ý tưởng hoạt động của thuật toán:

Tại mỗi lượt chơi:

1. BOT lấy toàn bộ nước đi hợp lệ.
2. Mỗi nước đi được mô phỏng thành một trạng thái bàn cờ mới.
3. BOT tiếp tục giả lập lượt đi của người chơi.
4. Quá trình này lặp lại nhiều lần tạo thành cây tìm kiếm.
5. Khi đạt giới hạn độ sâu hoặc kết thúc trò chơi, AI đánh giá bàn cờ.
6. BOT chọn nước đi có giá trị tốt nhất.

---

## BƯỚC 4: Kiểm tra điều kiện dừng

Thuật toán kiểm tra:

* Trò chơi đã kết thúc chưa.
* Hoặc đã đạt tới độ sâu tối đa chưa.

```ts
if (board.isGameOver()) return terminalScore(board);
if (depth === 0) return evaluate(board);
```

Ý nghĩa:

* Nếu game kết thúc → tính điểm cuối cùng.
* Nếu đạt giới hạn tìm kiếm → dùng hàm đánh giá bàn cờ.

Đây là điều kiện dừng của thuật toán đệ quy.

---

## BƯỚC 5: Sinh các nước đi hợp lệ

Thuật toán lấy tất cả nước đi có thể thực hiện:

```ts
const moves = board.getValidMoves(player);
```

Mỗi nước đi sẽ tạo ra:

* Một trạng thái bàn cờ mới.
* Một nhánh trong cây tìm kiếm.

---

## BƯỚC 6: BOT đóng vai trò MAX

Khi đến lượt BOT, thuật toán tìm nước đi có điểm số lớn nhất.

Quy trình:

* BOT thử từng nước đi.
* Mô phỏng trạng thái mới.
* Gọi đệ quy để dự đoán các lượt tiếp theo.
* Chọn nước đi có điểm số cao nhất.

```ts
if (maximizing) {
  let best = -Infinity;

  for (const move of moves) {
    const next = board.clone();
    next.makeMove(player, move);

    const score = minimax(
      next,
      depth - 1,
      alpha,
      beta,
      false,
      counter
    );

    if (score > best) best = score;
    if (best > alpha) alpha = best;

    if (beta <= alpha) break;
  }

  return best;
}
```

---

## BƯỚC 7: Người chơi đóng vai trò MIN

Khi đến lượt người chơi, thuật toán giả sử người chơi sẽ chọn phương án bất lợi nhất cho BOT.

Người chơi sẽ:

* Giảm lợi thế của BOT.
* Chọn nước đi có điểm thấp nhất đối với BOT.

```ts
else {
  let best = Infinity;

  for (const move of moves) {
    const next = board.clone();
    next.makeMove(player, move);

    const score = minimax(
      next,
      depth - 1,
      alpha,
      beta,
      true,
      counter
    );

    if (score < best) best = score;
    if (best < beta) beta = best;

    if (beta <= alpha) break;
  }

  return best;
}
```

---

## BƯỚC 8: Tối ưu bằng Alpha-Beta Pruning

Để tăng hiệu suất xử lý, hệ thống sử dụng kỹ thuật **Alpha-Beta Pruning** nhằm loại bỏ các nhánh không cần thiết trong cây tìm kiếm.

```ts
if (beta <= alpha) break;
```

Kỹ thuật này giúp:

* Giảm số trạng thái phải duyệt.
* Tăng tốc độ xử lý của AI.
* Giữ nguyên hiệu quả chiến thuật của thuật toán Minimax.

Nhờ đó BOT có thể tính toán nhanh hơn nhưng vẫn đảm bảo chất lượng quyết định.

---

## BƯỚC 9: Chọn nước đi tốt nhất

Sau khi đánh giá toàn bộ khả năng, BOT sẽ chọn nước đi có điểm số cao nhất.

```ts
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
```

Trong hàm này hệ thống sẽ:

* Gọi thuật toán Minimax.
* Tính điểm cho từng nước đi.
* So sánh kết quả.
* Trả về nước đi tối ưu nhất cho BOT.

---

# Kết luận

Nhờ áp dụng thuật toán **Minimax kết hợp Alpha-Beta Pruning**, BOT có khả năng:

* Dự đoán nhiều bước đi.
* Xây dựng chiến thuật.
* Phản ứng linh hoạt với người chơi.
* Tạo trải nghiệm chơi mang tính cạnh tranh và thử thách hơn.
