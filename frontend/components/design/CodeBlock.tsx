// 디자인 시스템의 코드 블록. 줄 번호 + 더블클릭 highlight 포함. lines 는 highlight 가 적용된 HTML 문자열 배열.
export function CodeBlock({
  title = "SQL",
  lines,
  language = "sql",
  maxHeight,
}: {
  title?: string;
  lines: string[];
  language?: string;
  maxHeight?: number;
}) {
  return (
    <div className="w-code">
      <div className="w-code__head">
        <div className="dots"><span/><span/><span/></div>
        <div>{title}</div>
        <div style={{ opacity: 0.6 }}>{language}</div>
      </div>
      <div className="w-code__body" style={maxHeight ? { maxHeight, overflow: "auto" } : undefined}>
        <div className="w-code__gutter">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="w-code__pre">
          {lines.map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </pre>
      </div>
    </div>
  );
}
