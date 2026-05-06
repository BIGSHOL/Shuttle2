# 셔틀이 — 진행 작업 계획

마지막 업데이트: 2026-05-06 (A·B·C안 모두 완료)

## 직전 진행 사항

체감 속도 개선 3안 모두 라이브:
- **A안 (`b3d84aa` + `17838fc`)**: `loading.tsx` 9개 + 폼 페이지 13개 skeleton — 클릭 시 즉시 fallback
- **B안 (`bc2098e`)**: middleware getUser 결과 header inject — 매 nav 50~200ms 단축
- **로그인 핫픽스 (`3cf306f`)**: loginAction 병렬 + dashboard 12 query 단일 Promise.all
- **C안 (이번 commit)**: 학부모 /home·/trip-live + 학원장 /dashboard에 Suspense 스트리밍

## C안 완료 (이번 commit)

각 페이지의 단일 `await Promise.all(...)` 묶음에서 빠른 KPI와 무거운 nested fetch가
같이 묶여 있던 구조 해소. 가장 느린 한 쿼리가 전체 첫 paint를 막던 부분 제거.

### 학부모 /home

- `_components/today-trips-section.tsx` 신규 server component
- page.tsx는 studentRows + upcomingAbsences + 2 counts만 즉시 fetch
- `getTodayChildTrips` (자녀 N × 노선 × 오늘 운행 nested fetch) → Suspense
- GreetingSection의 todayCount prop 제거 → 즉시 렌더 가능
- Skeleton: trip 카드 2개 모양 (`TodayTripsSectionSkeleton`)

### 학부모 /trip-live/[tripId]

- `_components/child-eta-section.tsx` 신규 server component
- page.tsx는 trip + pings (지도·헤더 필수) 즉시 fetch
- `getChildStopEta` (RouteStop별 평균 통과 분 계산) → Suspense
- `TripLiveShell` prop 변경: `childEta` → `childEtaSlot: ReactNode` (server component slot 패턴)
- fallback null → 학습 데이터 도착 시 카드 fade-in (기존 UX와 동일)

### 학원장 /dashboard

빠른 11 count + org만 page에서 즉시 fetch:
- vehicleCount, studentCount, stopCount, routeCount
- pendingAbsenceCount, pendingStopChangeCount, todayNoShowCount
- todayTripsTotal, runningTripsCount, finishedTripsCount (KPI 카드용)
- org (plan label)

무거운 4개 section을 server component로 분리:

| 컴포넌트 | 분리한 fetch | Skeleton |
|---|---|---|
| `today-trips-monitor.tsx` | todayTrips with includes + boarding stats per running trip | `TodayTripsMonitorSkeleton` (카드 2개) |
| `multi-trip-live-server.tsx` | 운행 중 trip nested fetch → MultiTripLiveSection client에 props | 작은 Skeleton bar (운행 0대면 null) |
| `repeat-no-show-alert.tsx` | 30일 NO_SHOW groupBy + 학생·보호자 fetch | null (없으면 안 보임) |
| `training-alert.tsx` | staffWithTraining nested | null |
| `expiring-vehicle-alert.tsx` | 어린이용 차량 보험 D-30 | null |

"모든 운행 정상" 뱃지는 제거 (4가지 alert 다 fetch 끝나야 알 수 있어 Suspense 후엔 의미 약화).

### 검증

- typecheck/lint clean
- 페이지 architecture: 빠른 KPI 즉시 → 무거운 sections 차례로 stream
- Suspense fallback은 page-level `loading.tsx`와 별개 — 페이지 안의 부분 영역 전용

## 남은 작업 (W23+)

체감 속도 관련 핫스팟 검토는 사실상 마무리. 추가 후보:

### 측정 단계

- Vercel Speed Insights → /home, /trip-live, /dashboard p75 LCP·TTFB 비교 (W22 전후)
- 사용자 체감 확인 — "클릭 직후 KPI/지도 보이고 alert는 차례로 표시되는지"

### 작은 후보 (즉시 가능, 효과 작음)

- `revalidatePath` 빈도 검토 — `publishTripUpdate` 호출 후 너무 잦은 fresh fetch?
- Vercel image optimization·preload font 활용도 점검
- Prisma `select` 더 좁히기 (불필요한 컬럼 제거)

### 기능 단계 (P1 — 베타 졸업 필수)

[progress.md](progress.md) `## 다음 우선순위 (W23+)` 참조:
1. 결제 통합 (Toss Payments 또는 Stripe)
2. 정식 법무 검토 (약관·개인정보처리방침)
3. 가입 확인 메일 한국어
4. 학부모 폰 OTP 가입

## 참고

- A안·B안·C안 완료 후 사용자 체감 측정 필요
- 기능 추가가 아니라 **체감 속도** 개선이 목표였음 → A(즉각적 win)·B(매 nav 단축)·C(첫 paint 단축)
  세 layer 모두 라이브
