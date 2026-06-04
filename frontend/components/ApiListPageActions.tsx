// /api-list 페이지 헤더의 액션 버튼 — JSON 가져오기/내보내기 + 신규 등록.
// page.tsx 가 server component 라 모달 상태와 클라이언트 다운로드는 본 client 측에서 처리.
"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { I } from "@/components/design/Icons";
import { BulkImportModal } from "@/components/BulkImportModal";

export function ApiListPageActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/mock/apis/export");
      if (!res.ok) {
        toast.error("내보내기에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apis-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("apis-*.json 다운로드를 시작했습니다.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Link href="/docs" className="w-btn w-btn--ghost w-btn--sm">
        <I name="Down" /> OpenAPI 다운로드
      </Link>
      <button
        type="button"
        className="w-btn w-btn--ghost w-btn--sm"
        onClick={handleExport}
        disabled={exporting}
        data-testid="api-export-btn"
      >
        <I name="Down" /> JSON 내보내기
      </button>
      <button
        type="button"
        className="w-btn w-btn--ghost w-btn--sm"
        onClick={() => setImportOpen(true)}
        data-testid="api-import-btn"
      >
        <I name="Plus" /> JSON 가져오기
      </button>
      <Link href="/api-list/new" className="w-btn w-btn--primary w-btn--sm">
        <I name="Plus" /> 신규 API 등록
      </Link>
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        kind="api"
      />
    </>
  );
}
