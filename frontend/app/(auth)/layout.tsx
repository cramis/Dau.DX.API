// 비로그인 화면(로그인/회원가입/비밀번호찾기) 의 Wanted 스플릿 셸. 좌측 브랜드 패널 + 우측 폼 카드.
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-auth-shell">
      <aside className="w-auth-brand" aria-hidden="true">
        <div className="w-auth-brand__top">
          <span className="w-auth-brand__mark">Dx</span>
          <span className="w-auth-brand__name">Dau.DX.API</span>
          <span className="w-auth-brand__pill">Mockup</span>
        </div>
        <p className="w-auth-brand__lead">
          데이터 팀이 직접 운영하는 <em>안전한 API 게이트웨이</em>.
        </p>
        <p className="w-auth-brand__sub">
          승인된 사용자만 접근하는 게이트, 라이브 모니터링, 무중단 hot-swap 까지
          한 화면에서 관리합니다.
        </p>
        <div className="w-auth-brand__highlights">
          <div className="w-auth-brand__chip">
            <b>셀프서비스</b>
            5단계로 신규 API 등록
          </div>
          <div className="w-auth-brand__chip">
            <b>실시간 감지</b>
            14:32 이상 자동 알림
          </div>
          <div className="w-auth-brand__chip">
            <b>무중단 전환</b>
            Hot-swap 78% 진행
          </div>
        </div>
      </aside>
      <main className="w-auth-panel">{children}</main>
    </div>
  );
}
