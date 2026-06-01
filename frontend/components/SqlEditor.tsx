// Monaco 기반 SQL 에디터 래퍼. value/onChange 컨트롤드, sql 언어 모드 고정.
"use client";

import dynamic from "next/dynamic";

// SSR 단계에서 navigator/window 접근 회피.
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <SqlEditorFallback /> }
);

function SqlEditorFallback() {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
      에디터 로딩 중...
    </div>
  );
}

export function SqlEditor({
  value,
  onChange,
  height = 260,
}: {
  value: string;
  onChange: (next: string) => void;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <MonacoEditor
        height={height}
        defaultLanguage="sql"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={(editor) => {
          // e2e 안정화 — 테스트가 .monaco-editor textarea 셀렉터 대신 editor.setValue 로 입력.
          if (typeof window !== "undefined") {
            (window as Window & { __sqlEditor?: unknown }).__sqlEditor = editor;
          }
        }}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          lineNumbers: "on",
          wordWrap: "on",
        }}
      />
    </div>
  );
}
