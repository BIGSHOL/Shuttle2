# 셔틀이 — 진행 작업 계획

마지막 업데이트: 2026-05-04 (A안 후속 마무리)

## 직전 진행 사항

사용자 피드백 "웹앱 반응속도가 여전히 느린곳이 제법 있네. 클릭해도 제법 대기해야 넘어가는데" 대응 중. **A안(loading.tsx 스켈레톤 추가) 완료** — 검증 미완 이슈 모두 해결됨. 다음은 B안(auth dedupe).

## A안 완료 (이번 커밋)

### 1) `<main>` 중첩 이슈 해결

**원인 진단**: 9개 `loading.tsx`와 그에 대응하는 `page.tsx`가 둘 다 `<main>`을 사용했음. Next.js streaming 중 잠깐 둘 다 DOM에 잡히는 케이스 발생 가능 + landmark 의미상 한 페이지에 `<main>` 1개여야 함.

**해결**: 8개 `loading.tsx`에서 `<main>` → `<div>`로 전부 변경 (`trip-live`는 이미 `<div fixed inset-0 z-50>`이라 그대로). page.tsx만 `<main>` 유지.

**검증**: 로컬 dev에서 `curl http://localhost:3000/<route> | grep -oE "<main\b" | wc -l`로 `/login`, `/signup`, `/forgot-password`, `/`, `/pricing`, `/terms` 모두 `1` 반환 확인.

**바뀐 파일**:

- `src/app/(auth)/loading.tsx` — outer container도 page.tsx 패턴(`bg-muted/40 flex min-h-screen items-center justify-center p-4`)에 맞춤
- `src/app/(driver)/run/loading.tsx`
- `src/app/(driver)/trip/[id]/loading.tsx`
- `src/app/(helper)/loading.tsx`
- `src/app/(owner)/dashboard/loading.tsx`
- `src/app/(owner)/loading.tsx`
- `src/app/(parent)/loading.tsx`
- `src/app/(parent)/home/loading.tsx`

### 2) 편집·신규 폼 페이지 form skeleton 추가

기존 `(owner)/loading.tsx`는 표 형식이라 form 페이지에서 시각 점프 발생. `FormSkeleton` 재사용 컴포넌트 + 13개 thin loading.tsx 추가.

**바뀐 파일**:

- 신규: `src/components/skeletons/form-skeleton.tsx` — 카드 + N개 입력 row + 버튼 row
- 신규 loading.tsx (11개, 3줄~5줄):
  - `(owner)/vehicles/[id]/edit/loading.tsx`
  - `(owner)/vehicles/new/loading.tsx`
  - `(owner)/students/[id]/edit/loading.tsx`
  - `(owner)/students/new/loading.tsx`
  - `(owner)/routes/[id]/edit/loading.tsx`
  - `(owner)/routes/new/loading.tsx`
  - `(owner)/staff/invite/loading.tsx`
  - `(owner)/guardians/invite/loading.tsx`
  - `(owner)/training/new/loading.tsx`
  - `(parent)/my-absences/new/loading.tsx`
- 신규 loading.tsx — 카카오맵 picker 포함 (지도 placeholder가 핵심):
  - `(owner)/stops/[id]/edit/loading.tsx`
  - `(owner)/stops/new/loading.tsx`
  - `(parent)/my-stop-changes/new/loading.tsx`

## 남은 작업

### B안 — 중복 auth round-trip 제거 (50~200ms/nav, ROI 높음)

현 구조: nav마다 `supabase.auth.getUser()`가 두 번 — proxy.ts middleware + page.tsx의 `getCurrentUser()`. React `cache()`는 같은 React render 내에서만 dedupe.

해결안:

```ts
// proxy.ts: getUser 결과를 request header에 inject
const {
  data: { user },
} = await supabase.auth.getUser();
if (user) {
  request.headers.set("x-auth-user-id", user.id);
  request.headers.set("x-auth-user-email", user.email ?? "");
}

// session.ts getCurrentUser: header 우선 lookup
const headersList = headers(); // next/headers
const userId = headersList.get("x-auth-user-id");
if (userId) {
  // header 신뢰 가능 — middleware에서 검증된 값
  const staff = await db.staff.findFirst({
    where: { userId },
    include: { org: true },
  });
  return ...;
}
// fallback: 기존 supabase.auth.getUser() (middleware 없는 RSC 진입 케이스)
```

**보안 검토 필요**: client가 header 위조 못 하도록 Vercel edge에서 확인. proxy.ts 외부에서 `x-auth-user-*` 헤더가 들어오면 strip.

작업량: middleware 1파일 + session.ts 1파일 + 보안 테스트 1회.

### C안 — Suspense 스트리밍

dashboard·home처럼 여러 query를 모은 페이지에 적용. 빠른 부분 먼저 송출, 느린 부분은 Suspense fallback.

후보:

- `/dashboard` — KPI count 7개는 빠름, 보험 D-30 + 오늘 trip list는 무거움 → 후자만 Suspense로 분리
- `/home` (parent) — student rows + today cards + upcoming absences 중 today cards가 무거움 (각 자녀별 trip 계산)
- `/trip-live/[tripId]` — getChildStopEta()가 RouteStop별 평균 계산이라 느릴 수 있음. ETA 카드만 Suspense로 분리.

작업량: 페이지당 30분~1시간 (Suspense + skeleton + 분리).

### 우선순위 권장

1. **B안** — auth dedupe (1~2시간). 매 nav에서 단축되므로 ROI 높음.
2. **C안** — B 끝낸 뒤 Speed Insights 데이터 보고 hot spot 결정.

## 참고

- A안 완료 후 사용자 체감 측정 필요 — "클릭 후 즉시 skeleton 보이는지" 확인.
- W18-K까지의 진행 상황은 [progress.md](progress.md) 마일스톤 섹션 참조.
- 사용자 사전 동의: 기능 추가가 아니라 **체감 속도** 개선이 목표 → 실제 fetch 단축(B·C)도 좋지만 skeleton(A)이 가장 즉각적인 win.
