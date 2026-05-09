// API 문서 뷰어 placeholder. 비로그인 접근 가능. Day 5 에서 정식 구현.
import { ComingSoon } from "@/components/ComingSoon";

export default function Page() {
  return (
    <div className="min-h-screen bg-muted/20">
      <ComingSoon name="API 문서" />
    </div>
  );
}
