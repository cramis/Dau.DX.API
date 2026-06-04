// 미니 라인 차트 — preserveAspectRatio="none" 으로 폭에 맞춰 자동 스케일.
export function LineChart({
  values,
  color = "var(--w-tint-primary)",
  stroke = 2,
  h = 120,
  w = 600,
  fill = true,
}: {
  values: number[];
  color?: string;
  stroke?: number;
  h?: number;
  w?: number;
  fill?: boolean;
}) {
  if (values.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}/>;
  const max = Math.max(...values, 1);
  const pts = values.map<[number, number]>((v, i) => [
    (i / (values.length - 1)) * w,
    h - (v / max) * (h - 8) - 4,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h }} aria-hidden>
      {fill && <path d={area} fill={color} opacity={0.08}/>}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
