// 인증키 1회 표시 다이얼로그. 닫고 나면 다시 못 본다는 경고 + 복사 버튼.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/design/Modal";
import { I } from "@/components/design/Icons";

interface Props {
  certKey: string | null;
  systemName: string;
  variant: "issued" | "regenerated";
  onClose: () => void;
}

export function CertKeyDialog({
  certKey,
  systemName,
  variant,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!certKey) return;
    try {
      await navigator.clipboard.writeText(certKey);
      setCopied(true);
      toast.success("인증키를 복사했습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다. 직접 선택 후 복사해 주세요.");
    }
  }

  return (
    <Modal
      open={!!certKey}
      onClose={onClose}
      title={
        variant === "issued" ? "인증키 발급 완료" : "인증키 재발급 완료"
      }
      footer={
        <button
          type="button"
          className="w-btn w-btn--primary"
          onClick={onClose}
        >
          확인
        </button>
      }
    >
      <div className="w-form-banner w-form-banner--info" data-testid="cert-key-warning">
        <span className="w-form-banner__ico">⚠</span>
        <div className="w-form-banner__body">
          <b>이 화면을 닫으면 인증키를 다시 볼 수 없습니다.</b>
          <br />
          반드시 저장하거나 담당자에게 전달한 뒤 닫으세요.
        </div>
      </div>

      <div className="w-stack" style={{ marginTop: 16 }}>
        <div>
          <p className="w-muted" style={{ fontSize: 12, margin: 0 }}>
            연계시스템
          </p>
          <p className="w-strong" style={{ margin: "2px 0 0", fontSize: 14 }}>
            {systemName}
          </p>
        </div>

        <div>
          <p className="w-muted" style={{ fontSize: 12, margin: 0 }}>
            발급된 인증키
          </p>
          <div
            className="w-input-row"
            style={{ marginTop: 4 }}
          >
            <input
              readOnly
              value={certKey ?? ""}
              className="w-input w-mono"
              data-testid="cert-key-value"
              style={{ fontSize: 12.5 }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="w-btn w-btn--soft"
              onClick={handleCopy}
            >
              <I name="Copy" size={12} />
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>

        <div className="w-notice w-notice--warn">
          <I name="Lock" size={14} />
          <div>
            연계시스템은 호출 시{" "}
            <span className="w-mono">X-Cert-Key</span> 헤더에 위 키를 그대로
            전달해야 합니다.
          </div>
        </div>
      </div>
    </Modal>
  );
}
