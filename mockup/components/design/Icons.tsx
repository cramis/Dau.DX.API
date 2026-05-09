// Wanted 디자인 시스템에서 사용하는 lucide 스타일 SVG 아이콘 모음.
import type { ReactNode } from "react";

type BaseProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

type IconShellProps = BaseProps & { children: ReactNode };

function IconShell({ size = 16, strokeWidth = 2, className = "", children }: IconShellProps) {
  return (
    <svg
      className={`ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export type IconName =
  | "Home" | "Api" | "Ds" | "Ext" | "Mon" | "Doc" | "Appr" | "User" | "Set"
  | "Search" | "Plus" | "Check" | "X" | "Play" | "Down" | "Right" | "Refresh"
  | "Filter" | "Bell" | "Bolt" | "Alert" | "Info" | "Spark" | "Eye" | "Copy"
  | "Lock" | "Trace" | "Swap" | "Branch" | "Menu";

export function I({
  name,
  size,
  strokeWidth,
  className,
}: { name: IconName } & BaseProps) {
  const props = { size, strokeWidth, className };
  switch (name) {
    case "Home":    return <IconShell {...props}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></IconShell>;
    case "Api":     return <IconShell {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h5"/></IconShell>;
    case "Ds":      return <IconShell {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14a8 3 0 0 0 16 0V5"/><path d="M4 12a8 3 0 0 0 16 0"/></IconShell>;
    case "Ext":     return <IconShell {...props}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 11l6-4M9 13l6 4"/></IconShell>;
    case "Mon":     return <IconShell {...props}><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></IconShell>;
    case "Doc":     return <IconShell {...props}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h6"/></IconShell>;
    case "Appr":    return <IconShell {...props}><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></IconShell>;
    case "User":    return <IconShell {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></IconShell>;
    case "Set":     return <IconShell {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></IconShell>;
    case "Search":  return <IconShell {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></IconShell>;
    case "Plus":    return <IconShell {...props}><path d="M12 5v14M5 12h14"/></IconShell>;
    case "Check":   return <IconShell {...props}><path d="M5 12l5 5L20 7"/></IconShell>;
    case "X":       return <IconShell {...props}><path d="M6 6l12 12M18 6L6 18"/></IconShell>;
    case "Play":    return <IconShell {...props}><polygon points="6 4 20 12 6 20 6 4"/></IconShell>;
    case "Down":    return <IconShell {...props}><path d="M12 5v14M5 12l7 7 7-7"/></IconShell>;
    case "Right":   return <IconShell {...props}><path d="m9 6 6 6-6 6"/></IconShell>;
    case "Refresh": return <IconShell {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></IconShell>;
    case "Filter":  return <IconShell {...props}><path d="M3 5h18M6 12h12M10 19h4"/></IconShell>;
    case "Bell":    return <IconShell {...props}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></IconShell>;
    case "Bolt":    return <IconShell {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></IconShell>;
    case "Alert":   return <IconShell {...props}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></IconShell>;
    case "Info":    return <IconShell {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></IconShell>;
    case "Spark":   return <IconShell {...props}><path d="M12 3v3M5 12H2M22 12h-3M5.6 5.6 3.5 3.5M20.5 3.5l-2.1 2.1M5.6 18.4l-2.1 2.1M20.5 20.5l-2.1-2.1"/><circle cx="12" cy="12" r="4"/></IconShell>;
    case "Eye":     return <IconShell {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></IconShell>;
    case "Copy":    return <IconShell {...props}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></IconShell>;
    case "Lock":    return <IconShell {...props}><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></IconShell>;
    case "Trace":   return <IconShell {...props}><path d="M4 6h16M4 12h10M4 18h7"/></IconShell>;
    case "Swap":    return <IconShell {...props}><path d="M7 7h13l-3-3M17 17H4l3 3"/></IconShell>;
    case "Branch":  return <IconShell {...props}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 8v8M6 14a8 8 0 0 0 8-8"/></IconShell>;
    case "Menu":    return <IconShell {...props}><path d="M4 6h16M4 12h16M4 18h16"/></IconShell>;
  }
}

export function CheckCircle({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
