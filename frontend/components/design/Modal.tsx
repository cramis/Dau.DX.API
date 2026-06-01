// Wanted 토큰 기반 모달. ESC 닫기 + body 스크롤 락 + 백드롭 클릭 닫기.
"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { I } from "@/components/design/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "default" | "lg";
  children: ReactNode;
  footer?: ReactNode;
  splitFooter?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  size = "default",
  children,
  footer,
  splitFooter,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="w-modal-overlay" onClick={onClose}>
      <div
        className={`w-modal ${size === "lg" ? "w-modal--lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="w-modal__head">
          <h2 className="w-modal__title">{title}</h2>
          <button
            type="button"
            className="w-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            <I name="X" size={14} />
          </button>
        </div>
        <div className="w-modal__body">{children}</div>
        {footer && (
          <div className={`w-modal__foot${splitFooter ? " w-modal__foot--split" : ""}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
