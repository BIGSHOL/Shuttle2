# Plan: 정류장 통과 시각 list inline 통합 (W24 후보)

> **상태**: 계획 — 코드 미적용. 다른 컴퓨터에서 git pull 후 이어 진행 가능.
> **작성일**: 2026-05-07 (W23-B 직후)
> **예상 시간**: 학원장만 30~45분 / 학부모 trip-live까지 +30분

---

## 의도

학원장 trip 상세 페이지의 두 영역이 분리되어 있어 학원장이 정류장별
도착 시각을 확인하려면 두 곳을 번갈아 봐야 함. 한 view로 통합해서
"정류장·탑승 진행" list 안에 도착 시각 + 구간 소요를 inline 표시.

**원 사용자 피드백 (2026-05-07)**: "정류장·탑승 진행" list만 보고 "정류장
통과 시각도 시간으로 기록되는지" 의문. 데이터(LocationPing source=STOP_PASS)는
이미 기록되지만 같은 list에서 안 보여 별도 카드 표로 가야 했음.

---

## 현재 동작 (plan 시작 시점)

### 데이터 (이미 동작)

- `LocationPing.source = STOP_PASS` ping을 driver 폰이 정류장 반경
  (`Stop.radiusM`, 기본 50m / 데모 150m) 진입 시 자동 기록
  ([gps-tracker.tsx](../../src/app/(driver)/trip/[id]/gps-tracker.tsx#L97))
- [src/lib/geo/trip-stats.ts](../../src/lib/geo/trip-stats.ts) 의
  `computeStopArrivals(pings, stops)` → `StopArrival[]` 계산
  - 반환: `{ stopId, stopName, stopOrder, arrivedAt: Date|null, segmentSec: number|null }[]`
  - stopOrder 순서대로 STOP_PASS ping을 1:1 매핑

### 화면 (현재 분리됨)

- 학원장 trip 상세 [page.tsx](../../src/app/(owner)/dashboard/trip/[tripId]/page.tsx):
  - line 197~207: `stopArrivals = computeStopArrivals(...)` 이미 계산
  - line 595~ : "정류장·탑승 진행" / "정류장·하차 진행" inline list (학생별 처리 상태)
  - 별도 카드: [`_components/stop-arrivals-table.tsx`](../../src/app/(owner)/dashboard/trip/[tripId]/_components/stop-arrivals-table.tsx)
    — "정류장 도착 시각 + 구간 소요" 표 (W19-D)
- 학부모 trip-live [stop-rail-timeline.tsx](../../src/app/(parent)/trip-live/[tripId]/_components/stop-rail-timeline.tsx)
  — 정류장 rail. 통과 여부(`status: passed/next/pending`)는 표시하지만 통과
  시각은 없음.

---

## 목표 UI

```
1. 산격대우아파트 (데모·출발)         🕒 08:00 · 통과 08:03
   ✓ 데모 학생 5                       탑승 08:03
   📅 데모 학생 1                      결석 (확인)

2. 도청교 앞 브라운도트                🕒 08:10 · 통과 08:11 (1분 8초)
   ✓ 데모 학생 2                       탑승 08:11

3. 출근길                              🕒 08:20 · 통과 -
   ○ 데모 학생 3                       탑승 대기
```

- 정류장 row 우측: 예정 시각 + 통과 시각(`HH:mm`) + 구간 소요(2번째 정류장부터)
- STOP_PASS ping 0개인 경우 "통과 -" 또는 hidden (조건부)
- 학생 row는 그대로 (탑승·결석 시각 표시 유지)

---

## 영향 범위

### 학원장 trip 상세 (이 plan 메인)

| 파일 | 변경 |
|---|---|
| [`page.tsx`](../../src/app/(owner)/dashboard/trip/[tripId]/page.tsx) | line 197~207의 `stopArrivals`를 `Map<stopId, StopArrival>`로 변환. line 595~ 정류장 row에서 lookup해서 도착 시각·구간 소요 표시 |
| [`_components/stop-arrivals-table.tsx`](../../src/app/(owner)/dashboard/trip/[tripId]/_components/stop-arrivals-table.tsx) | **유지 권장** — 분기별 안전운행기록 PDF 자료성 보존. 베타 운영 후 학원장 피드백 보고 통합 list만으로 충분하면 그때 제거 |

### 학부모 trip-live (선택, 동일 패턴)

| 파일 | 변경 |
|---|---|
| [`page.tsx`](../../src/app/(parent)/trip-live/[tripId]/page.tsx) | 이미 line 56에서 STOP_PASS ping fetch 중. 단순 `passedStopIds` 외에 `computeStopArrivals` 호출 추가해서 `stopArrivals` 생성 |
| [`trip-live-shell.tsx`](../../src/app/(parent)/trip-live/[tripId]/_components/trip-live-shell.tsx) | `stopArrivals` prop 추가, rail item으로 전달 |
| [`stop-rail-timeline.tsx`](../../src/app/(parent)/trip-live/[tripId]/_components/stop-rail-timeline.tsx) | `RailItem` 타입에 `arrivedAt: Date \| null` 추가, 정류장 옆에 통과 시각 inline |

### utility (변경 없음)

- [`src/lib/geo/trip-stats.ts`](../../src/lib/geo/trip-stats.ts) — `computeStopArrivals` 그대로 재사용

---

## 데이터 흐름

```
LocationPing (DB)
  ↓ db.locationPing.findMany({ where: { tripId, source: { in: [STOP_PASS, INTERVAL, START, END] } }, orderBy: { recordedAt: "asc" } })
PingPoint[]
  ↓ computeStopArrivals(pings, stops)  // src/lib/geo/trip-stats.ts
StopArrival[]
  ↓ new Map(stopArrivals.map((a) => [a.stopId, a]))
Map<stopId, StopArrival>
  ↓ list 정류장 row에서 stop.id로 lookup
HH:mm 표시 (KST 변환 — date-fns 또는 inline)
```

---

## 구현 step (다른 컴퓨터에서 이어가는 절차)

```bash
# 1. 코드·툴 준비
git pull origin main
pnpm install                     # node-linker=hoisted, ~3분 (필요 시)

# 2. EXPO_TOKEN (RN 빌드 트리거 시) 회전한 새 토큰을 PowerShell 세션에 set
$env:EXPO_TOKEN = "<new>"
```

### 학원장 trip 상세 통합

1. [page.tsx](../../src/app/(owner)/dashboard/trip/[tripId]/page.tsx) 열기
2. line 207 다음에 추가:
   ```ts
   const stopArrivalMap = new Map(stopArrivals.map((a) => [a.stopId, a]));
   ```
3. line 595~ "정류장·탑승 진행" list 부분에서 정류장 row 렌더 시:
   ```tsx
   const arrival = stopArrivalMap.get(stop.id);
   const arrivedHHmm = arrival?.arrivedAt
     ? formatKstHHmm(arrival.arrivedAt)
     : null;
   const segmentLabel = arrival?.segmentSec != null
     ? formatSegmentSec(arrival.segmentSec) // "1분 8초" 등
     : null;
   ```
4. 정류장 row UI에 시각 옆 inline:
   ```tsx
   <span>🕒 {stop.scheduledAt}</span>
   {arrivedHHmm ? <span>· 통과 {arrivedHHmm}{segmentLabel ? ` (${segmentLabel})` : ""}</span> : null}
   ```
5. KST 변환 helper 재사용 또는 inline:
   - `(d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(11, 16)`
   - 또는 `src/lib/date/today.ts`에 helper 있으면 그것 사용

### 학부모 trip-live 동일 패턴 (선택)

6. [page.tsx](../../src/app/(parent)/trip-live/[tripId]/page.tsx) line 56 부근:
   ```ts
   const allPings = await db.locationPing.findMany({
     where: { tripId, source: { in: ["STOP_PASS", "START", "END"] } },
     orderBy: { recordedAt: "asc" },
     select: { /* ... */ },
   });
   const stopArrivals = computeStopArrivals(
     allPings.map(toPingPoint),
     trip.route.stops.map((rs) => ({ stopId: rs.stop.id, stopName: rs.stop.name, stopOrder: rs.order })),
   );
   ```
7. trip-live-shell에 `stopArrivals` prop 전달
8. stop-rail-timeline.tsx의 `RailItem` 타입에 `arrivedHHmm: string | null` 추가
9. rail item 렌더에 통과 시각 inline

### 검증·배포

10. `pnpm typecheck && pnpm lint`
11. (선택) `pnpm dev` → 학원장 로그인 → /dashboard/trip/<id> 진입.
    단 production demo org에는 STOP_PASS ping 0개라 inline은 hidden 상태로
    렌더링되는지만 확인. 진짜 데이터는 production 베타 운행 후.
12. commit + push:
    ```
    feat(owner+parent): 정류장 통과 시각 list inline 통합

    학원장 trip 상세 + 학부모 trip-live 정류장 row에 STOP_PASS 도착 시각·
    구간 소요 inline 표시. lib/geo/trip-stats.ts computeStopArrivals 재사용.
    별도 stop-arrivals-table 카드는 PDF 자료용·history 보존 위해 유지.

    원 피드백: 사용자가 list와 별도 표 두 곳을 봐야 정류장 통과 시각 확인
    가능했던 UX. 한 view 통합.
    ```

---

## 검증 방법

### 데모 환경 (STOP_PASS 0개)

- list 변경 후 정류장 row가 깨지지 않고 정상 렌더
- 통과 시각·구간 소요 영역은 hidden 또는 "-"
- typecheck / lint clean

### Production 베타 (실제 운행 후)

- driver 폰을 들고 정류장 다닌 운행을 한 번 종료
- 학원장 trip 상세 / 학부모 trip-live 진입 → 정류장 row에 통과 시각 + 구간 소요 표시
- 안전운행기록 PDF의 정류장 시각(W19-A `trip-stats.ts` 동일 source)과 일치 확인

### Edge cases

| 케이스 | 기대 동작 |
|---|---|
| 운행 시작 안 한 trip | `stopArrivals = []` (page.tsx line 207 fallback) → list에 통과 시각 안 보임 |
| STOP_PASS ping 0개 | 모든 `arrivedAt = null` → "통과 -" 또는 hidden |
| driver가 정류장 건너뜀 | 그 정류장만 `arrivedAt = null`, 다음 정류장 `segmentSec` 계산이 한 칸 밀릴 수 있음 (utility 한계 — 후속 작업) |

---

## 후속 작업 (이 plan 안 함)

- `computeStopArrivals` 매핑 정확도 개선 (가장 가까운 stop으로 매핑) —
  현재는 stopOrder 순서대로 1:1 매핑이라 driver가 역순·건너뛰기 시 어긋남.
  베타 운영 후 사용자 피드백 따라 결정.
- 통합 후 [`stop-arrivals-table.tsx`](../../src/app/(owner)/dashboard/trip/[tripId]/_components/stop-arrivals-table.tsx)
  별도 카드 제거 여부. 1차 plan은 PDF 자료성·history 보존 위해 유지.
- driver 폰 GPS 좌표 시뮬 도구 (검증 편리화) — 별도 plan.

---

## 관련 기존 commit (참고)

- `2ffc78e` W19-B 운행 중 trail polyline (STOP_PASS 위주 데이터 흐름 도입)
- `3acc2b3` W19-D Trip 상세 통계 + stop-arrivals-table 신규
- `475310e` W19-A `trip-stats` utility (`computeStopArrivals`)
- `bb61a1a` 시드 정류장 address (W23-B)
- `1bfa980` 정류장 marker +1 offset fix (W23-B)
