# 셔틀이 — 진행 작업 계획

마지막 업데이트: 2026-05-04

## 직전 진행 사항

사용자 피드백 "웹앱 반응속도가 여전히 느린곳이 제법 있네. 클릭해도 제법 대기해야 넘어가는데" 대응 중. 분석한 3가지 개선 방향 중 **A안(loading.tsx 스켈레톤 추가)** 부터 진행했음.

## 지금 작업 상태 (이번 커밋에 들어감)

### 완료
- [src/components/ui/skeleton.tsx](src/components/ui/skeleton.tsx) — shadcn 스타일 Skeleton primitive (`animate-pulse rounded-md` + data-slot)
- 9개 `loading.tsx` 추가:
  - [src/app/(owner)/loading.tsx](src/app/(owner)/loading.tsx) — 표 형식 일반 (vehicles/students/routes/stops/staff/guardians/absences/training/...)
  - [src/app/(owner)/dashboard/loading.tsx](src/app/(owner)/dashboard/loading.tsx) — KPI 카드 7개 grid + 운행 list
  - [src/app/(parent)/loading.tsx](src/app/(parent)/loading.tsx) — 학부모 list 페이지 일반 (notifications/my-absences/my-stop-changes)
  - [src/app/(parent)/home/loading.tsx](src/app/(parent)/home/loading.tsx) — 인사말 + trip 카드 stack
  - [src/app/(parent)/trip-live/[tripId]/loading.tsx](src/app/(parent)/trip-live/[tripId]/loading.tsx) — fixed inset-0 풀스크린 지도 placeholder
  - [src/app/(driver)/run/loading.tsx](src/app/(driver)/run/loading.tsx)
  - [src/app/(driver)/trip/[id]/loading.tsx](src/app/(driver)/trip/[id]/loading.tsx) — dark gradient 헤더 + 정류장 progress
  - [src/app/(helper)/loading.tsx](src/app/(helper)/loading.tsx)
  - [src/app/(auth)/loading.tsx](src/app/(auth)/loading.tsx) — 로그인·가입·비번 재설정
- typecheck + lint 통과

### 검증 미완 (사용자 중지 시점)
- 브라우저에서 실제 navigation 시 skeleton이 잠깐 보이는지 확인 중에 `<main>`이 2개 잡히는 이상 동작 발견. (auth) layout이 별도로 있는데 loading.tsx의 `<main>`이 추가로 추가돼 중첩될 가능성 있음. 확인 필요.

## 남은 작업 (다음 세션)

### A안 후속 — loading.tsx 검증·다듬기

1. **`<main>` 중첩 확인** — 로그인 페이지 reload 시 `document.querySelectorAll('main')`이 2개 반환됨.
   - 가설 1: dev server stale Suspense state (HMR artifact). 프로덕션 빌드에선 정상일 수 있음. 프로덕션 배포 후 재확인.
   - 가설 2: 각 loading.tsx에서 `<main>` 사용했는데 (auth) layout은 자체 `<main>`을 안 두고 page.tsx가 main을 둘 수도. layout 구조 확인하고 loading.tsx도 동일 컨테이너로 통일.
2. **편집 페이지 loading 추가** — 현재 그룹 root `loading.tsx`가 모든 자식을 cover하지만 vehicles/students/routes/stops `[id]/edit` 페이지는 form 위주라 표 skeleton이 안 맞음. 폼 형태 skeleton 추가 검토.
3. **체감 측정** — 사용자에게 "클릭 후 즉시 skeleton 보이는지" 확인 요청.

### B안 — 중복 auth round-trip 제거 (50~200ms/nav)

현 구조: nav마다 `supabase.auth.getUser()`가 두 번 — proxy.ts middleware + page.tsx의 `getCurrentUser()`. React `cache()`는 같은 React render 내에서만 dedupe.

해결안:

```ts
// proxy.ts: getUser 결과를 request header에 inject
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  request.headers.set("x-auth-user-id", user.id);
  request.headers.set("x-auth-user-email", user.email ?? "");
}

// session.ts getCurrentUser: header 우선 lookup
const headersList = headers(); // next/headers
const userId = headersList.get("x-auth-user-id");
if (userId) {
  // header 신뢰 가능 — middleware에서 검증된 값
  const staff = await db.staff.findFirst({ where: { userId }, include: { org: true }});
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

1. **A안 검증·다듬기** — `<main>` 중첩 이슈 확인 (10분), 편집 폼 skeleton 추가 (30분)
2. **B안** — auth dedupe (1~2시간). 매 nav에서 단축되므로 ROI 높음.
3. **C안** — A·B 끝낸 뒤 Speed Insights 데이터 보고 hot spot 결정.

## 참고

- W18-K까지의 진행 상황은 [progress.md](progress.md) 마일스톤 섹션 참조
- 사용자가 사전 동의: 기능 추가가 아니라 **체감 속도** 개선이 목표 → 실제 fetch 단축(B·C)도 좋지만 skeleton(A)이 가장 즉각적인 win
