// Day 1 단계의 화면 placeholder. 각 라우트가 404 없이 노출되도록 자리만 잡는다.
export function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-2 p-8 text-muted-foreground">
      <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
      <p className="text-sm">Coming soon — Day 2 이후 단계에서 구현됩니다.</p>
    </div>
  );
}
