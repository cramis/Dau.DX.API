// 폼 상단/하단의 영구 인라인 메시지 배너. Wanted 디자인 토큰 기반.
// data-testid 와 role 은 e2e 계약을 유지한다 (form-banner-{variant}, role=alert/status).
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info";

const ICONS: Record<Variant, string> = {
  error: "⚠",
  success: "✓",
  info: "ℹ",
};

export function FormBanner({
  variant,
  children,
  className,
}: {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      data-testid={`form-banner-${variant}`}
      className={cn("w-form-banner", `w-form-banner--${variant}`, className)}
    >
      <span aria-hidden="true" className="w-form-banner__ico">
        {ICONS[variant]}
      </span>
      <div className="w-form-banner__body">{children}</div>
    </div>
  );
}
