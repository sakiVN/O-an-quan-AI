import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function RulesModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-primary-foreground bg-primary/90 hover:bg-primary hover:text-white border-none shadow-sm rounded-full">
          <BookOpen className="w-4 h-4" />
          <span>Luật chơi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] flex flex-col max-h-[85dvh] bg-card/95 backdrop-blur-sm border-primary/20 text-card-foreground">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-serif text-primary">Cách chơi Ô Ăn Quan</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Trò chơi dân gian Việt Nam với mục tiêu thu thập được nhiều quân nhất.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 my-2 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">1. Bắt đầu</h4>
            <p>
              Bàn cờ có 2 ô Quan lớn ở 2 đầu (mỗi ô 1 viên đá lớn) và 10 ô dân chia làm 2 hàng (mỗi ô 5 viên đá nhỏ). Bạn điều khiển 5 ô dân ở hàng dưới.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">2. Cách đi (Rải quân)</h4>
            <p>
              Đến lượt, bạn chọn một ô của mình có quân, và rải từng viên một vào các ô tiếp theo theo một chiều (trái hoặc phải).
            </p>
            <p>
              Khi rải hết viên cuối cùng:
              <br />• Nếu ô tiếp theo có quân: Lấy toàn bộ quân ở ô đó rải tiếp.
              <br />• Nếu ô tiếp theo trống và ô sau nó có quân: Bạn được <b>ăn</b> toàn bộ quân ở ô đó. Có thể ăn liên hoàn nếu xen kẽ 1 ô trống.
              <br />• Nếu ô tiếp theo là ô Quan hoặc 2 ô trống liên tiếp: Mất lượt.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">3. Kho điểm: dân & quan</h4>
            <p>
              Điểm của mỗi bên tách riêng <b>dân</b> (mỗi viên 1 điểm) và <b>quan</b> (mỗi viên đáng 5 hoặc 10 điểm tùy thiết lập). Bảng điểm hiện tổng và chi tiết.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">4. Hết quân – nạp & bán quan</h4>
            <p>
              Khi đến lượt mà cả 5 ô bên bạn đều trống, bạn phải bỏ <b>5 dân</b> từ kho ra rải lại (mỗi ô 1 viên).
            </p>
            <p>
              Nếu không đủ 5 dân, bạn phải <b>bán 1 quan cho đối phương</b> để đổi lấy dân theo tỉ lệ <b>1 quan = 5 hoặc 10 dân</b> (tuỳ thiết lập). Nếu bạn không còn quan để bán, hoặc đối phương không đủ dân để mua, ván đấu kết thúc – bạn thua.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">5. Kết thúc</h4>
            <p>
              Ván đấu kết thúc khi <b>cả 2 ô Quan đều rỗng</b> – đúng câu "<i>hết quan, tàn dân, thu quân, bán ruộng</i>". Quân còn trên các ô dân được cộng vào kho của chủ hàng đó. Ai có tổng điểm cao hơn sẽ thắng.
            </p>
            <p>
              Ván cũng có thể kết thúc sớm nếu một bên không thể nạp quân (hết dân, hết quan, hoặc đối phương không đủ dân để mua quan).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
