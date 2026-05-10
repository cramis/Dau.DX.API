// 연계시스템 인증키 생성 — `AKAD####-XXXXXXXX-YYYYYYYY-ZZZZZZZZ` 형식.
// id 의 마지막 4자리(예: E20260509001 → 9001)를 prefix 로 사용해 가독성 + 추적성을 부여한다.

function hex(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += Math.floor(Math.random() * 16)
      .toString(16)
      .toUpperCase();
  }
  return out;
}

export function generateCertKey(extId: string): string {
  const tail = extId.slice(-4).padStart(4, "0");
  return `AKAD${tail}-${hex(8)}-${hex(8)}-${hex(8)}`;
}
