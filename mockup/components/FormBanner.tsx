// 폼 상단/하단의 영구 인라인 메시지 배너. toast 의 ephemeral 한 한계를 보완해
// 사용자가 화면에서 무엇이 문제인지 즉시 파악할 수 있게 한다.
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info";

const VARIANT_CLS: Record<Variant, string> = {
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  success:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
  info: "border-foreground/20 bg-muted text-foreground",
};

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
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        VARIANT_CLS[variant],
        className
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold leading-tight">
        {ICONS[variant]}
      </span>
      <div className="flex-1 whitespace-pre-line break-keep">{children}</div>
    </div>
  );
}
