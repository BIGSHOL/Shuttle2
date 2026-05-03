# 셔틀이 진행 현황

> **이 문서는 세션 중간에도 업데이트되어 웹/앱 클로드 코드로 이어갈 수 있게 함**
> 마지막 업데이트: 2026-05-04 (W12 빌드 통과 → 배포 직전)

## 완료된 마일스톤

| 단계 | 내용 | 커밋 | 배포 |
|---|---|---|---|
| W1~W7 | 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육 | `e224bf6` | ✅ |
| W8 | 마케팅 랜딩 + 사전등록 + admin | `b830a72` | ✅ |
| W9 | 학부모 home + trip-live 디자인 | `16c9805` | ✅ |
| W10 | Notification 모델 + StopChangeRequest + 결석 반려 + 학부모/owner 워크플로우 | `abb8a5b`, `00f07eb` | ✅ |
| W11 | 기사 화면 디자인 (mobile-first + dark gradient running header + tokens) | `b4cb872` | ✅ |

**프로덕션**: https://shuttle2-nine.vercel.app/ → 200 OK

## 현재 진행 중: W12 — 학원장 dashboard 디자인 + 실시간 운행 모니터

### 완료
- [x] `(owner)/layout.tsx` — unreadCount 주입
- [x] `(owner)/header.tsx` — sticky + bell + unread 배지 + 모바일 가로 스크롤 nav
- [x] `(owner)/dashboard/notifications/{page,notification-list,notification-actions}.tsx` 신규 생성
- [x] `(owner)/dashboard/page.tsx` 재구성:
  - KPI 4 cards: 오늘 운행 / 진행 중 차량 / 대기 요청 / 등록 자원
  - 오늘 운행 모니터 (running=dark gradient, scheduled/finished=white card)
  - 안전교육 알림 (warning-soft + 직원별)
  - 보험 만료 알림 (warning-soft + 차량별)
  - 빠른 이동 (vehicles/stops/routes/students 4 link)

### 진행 중
- [x] **owner 리스트 페이지 토큰 마이그레이션** 완료
  - `/students/page.tsx` — KIDS 뱃지 bg-bus + bg-muted
  - `/routes/page.tsx` — PICKUP=success-soft, DROPOFF=info-soft
  - `/vehicles/page.tsx` — KIDS=bus, GENERAL=muted
  - `/staff/page.tsx` — OWNER=primary, DRIVER=success, HELPER=info
  - `/guardians/invite/invite-form.tsx` — success-soft 카드
  - `/students/[id]/edit/route-students-section.tsx` — 방향 토큰
  - `/vehicles/_components/vehicle-form.tsx` — KIDS 모드 안내 warning-soft
- [x] owner 알림 페이지 토큰 마이그레이션 완료
  - `/training/page.tsx` — 만료=destructive, 유효=success
  - `/safety-report/page.tsx` — KIDS 차량 없음=warning-soft
  - `/absences/page.tsx` — STATUS_COLOR 토큰화
  - `/stop-change-requests/page.tsx` — STATUS_COLOR 토큰화
- [x] typecheck/lint/build 모두 통과
- [ ] commit + deploy W12

### W12 결정사항·이슈
- **owner trip-live 접근 불가**: `(parent)/trip-live`는 `requireGuardianTripAccess`로 가드.
  → 운행 중 카드는 시각만 (link 없음). owner-side 실시간 상세는 W13+로 미룸.
- **BoardingType에 NO_SHOW 없음**: schema는 BOARD/ALIGHT만. 미해결 이슈는
  pendingAbsenceCount + pendingStopChangeCount만으로 KPI 계산.
- **Trip.orgId 직접 컬럼 없음** → `where: { vehicle: { orgId } }` 패턴.

## 다음 우선순위 (이번 세션 또는 다음)

1. **W12 완료** — owner 페이지 토큰 마이그레이션 + verify + deploy
2. **W13 (디자인 W6)** — 마케팅 랜딩 디자인 + 가입 분기 + 요금제 UI
3. **W14+** — owner-side trip-live 모니터 (실시간 지도 view)
4. **W15+** — Notification 카테고리 SHUTTLE_NEAR_CHILD 추가, BoardingType 확장
5. **장기**: BottomTabBar (홈/기록/설정) 학부모용

## 디자인 토큰 매핑 (참고)

```
bg-emerald-* → bg-success-soft + text-success
bg-amber-*   → bg-warning-soft + text-warning
bg-sky-*     → bg-info-soft + text-info
bg-rose-*    → bg-destructive/10 + text-destructive
bg-violet-*  → bg-primary/10 + text-primary
bg-zinc-100/200 → bg-muted + text-muted-foreground
```

## 주요 라우트

| 그룹 | 라우트 | 설명 |
|---|---|---|
| (parent) | `/home`, `/trip-live/[tripId]`, `/notifications`, `/my-absences`, `/my-stop-changes` | 학부모 모바일 |
| (driver) | `/run`, `/run/notifications`, `/trip/[id]` | 기사 모바일 |
| (helper) | `/helper-run`, `/trip/[id]` | 동승자 모바일 |
| (owner)  | `/dashboard`, `/dashboard/notifications`, `/vehicles`, `/students`, `/routes`, `/stops`, `/staff`, `/guardians`, `/absences`, `/stop-change-requests`, `/training`, `/safety-report` | 학원장 PC/태블릿 |
| (marketing) | `/`, `/admin/pre-registrations` | 마케팅 + admin |

## 핵심 가드레일 (CLAUDE.md 발췌)

- TypeScript strict, `any` 금지
- Tailwind 임의 색상 (`bg-[#abc]`) 금지 → 토큰만
- 한 파일 300줄 넘으면 분리
- localStorage·sessionStorage 사용 X
- Wake Lock·GPS lifecycle 손대지 말 것
- 100dvh로 iOS Safari address bar 대응
- 학부모 본인 자녀 trip만 (`requireGuardianTripAccess`)
- 모든 도메인 쿼리는 orgId 필터
