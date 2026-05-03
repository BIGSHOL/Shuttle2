# 셔틀이 진행 현황

> **이 문서는 세션 중간에도 업데이트되어 웹/앱 클로드 코드로 이어갈 수 있게 함**
> 마지막 업데이트: 2026-05-04 (W13 완료 → W14 디자인 마무리·확장 단계 검토)

## 완료된 마일스톤

| 단계 | 내용 | 커밋 | 배포 |
|---|---|---|---|
| W1~W7 | 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육 | `e224bf6` | ✅ |
| W8 | 마케팅 랜딩 + 사전등록 + admin | `b830a72` | ✅ |
| W9 | 학부모 home + trip-live 디자인 | `16c9805` | ✅ |
| W10 | Notification 모델 + StopChangeRequest + 결석 반려 + 학부모/owner 워크플로우 | `abb8a5b`, `00f07eb` | ✅ |
| W11 | 기사 화면 디자인 (mobile-first + dark gradient running header + tokens) | `b4cb872` | ✅ |
| W12 | 학원장 dashboard 재구성 + 실시간 운행 모니터 + owner 토큰 마이그레이션 | `f87e566` | ✅ |
| W13 | 마케팅 랜딩 디자인 + /pricing 신규 + login/signup 디자인 | (다음 commit) | ✅ |

**프로덕션**: https://shuttle2-nine.vercel.app/ → 200 OK

## W12 완료 (`f87e566` 배포됨)

### 결과
- (owner)/layout — unreadCount 주입
- (owner)/header — sticky + bell + unread 배지 + 모바일 가로 스크롤 nav
- (owner)/dashboard/notifications — 학원장 알림 인박스
- (owner)/dashboard 재구성:
  - KPI 4 cards: 오늘 운행 / 진행 중 차량 / 대기 요청 / 등록 자원
  - 오늘 운행 모니터 (running=dark gradient, scheduled/finished=white)
  - 안전교육·보험 D-30 알림 (warning-soft + row)
  - 빠른 이동 4 link
- owner CRUD/alerts 11 페이지 토큰 마이그레이션

### W12 결정사항·이슈
- **owner trip-live 접근 불가**: `(parent)/trip-live`는 `requireGuardianTripAccess`로 가드.
  → 운행 중 카드는 시각만 (link 없음). owner-side 실시간 상세는 W14+로 미룸.
- **BoardingType에 NO_SHOW 없음**: schema는 BOARD/ALIGHT만. 미해결 이슈는
  pendingAbsenceCount + pendingStopChangeCount만으로 KPI 계산.
- **Trip.orgId 직접 컬럼 없음** → `where: { vehicle: { orgId } }` 패턴.

## W13 완료 (마케팅·가입)

### 결과
- `(marketing)/page.tsx` 완전 재설계:
  - sticky 헤더 + 글래스 효과
  - Hero: 큰 카피 + 모바일 mock (dark gradient + LIVE 뱃지 + "약 4분")
  - Pain points 3 카드 (destructive/warning/info tone)
  - Features 4 카드 (안전운행 / GPS / 결석·정류장 / 푸시)
  - 셔틀이 vs 기존 비교 표 (`bg-bus-soft`로 우리 컬럼 강조)
  - 요금제 요약 (Lite/Standard/Pro 3 cards, Standard에 추천 배지)
  - 베타 사전등록 CTA + 푸터
- `(marketing)/pricing/page.tsx` 신규:
  - 3-tier 카드 (각 카드에 8개 feature ✓/✗)
  - FAQ 6 항목 (`<details>` 아코디언)
  - 베타 무료 안내
- `(auth)/login`, `(auth)/signup` 재디자인:
  - 셔틀이 로고 + 둥근 카드 + 큰 버튼
  - signup의 기관 유형 3종 라디오를 `has-[:checked]:border-bus`로 시각 강조
  - 학부모 안내 카드 추가 (signup 하단)
- `pre-register-form` success state 토큰화

### 알려진 제약 (W14+에서)
- 학부모 가입 분기 — 현재 `/parent-invite/[token]` 라우트만 존재. 토큰 없이 자녀 검색 가능한 가입 흐름은 별도 추가 필요
- 비밀번호 재설정 페이지 부재
- 폰 OTP 로그인 (Tabs로 분기)는 다음 세션
- 약관·개인정보처리방침 페이지

## 다음: W14 — 옵션 1) 학부모 가입 흐름 보강 또는 옵션 2) Owner-side trip 상세 view

### 옵션 1) 학부모 가입 흐름 (실서비스 출시 직전 필수)
- `/parent-invite/[token]` 디자인 보강
- 폰 OTP 인증 흐름
- 푸시 권한 요청 단계
- 자녀 정보 확인 카드

### 옵션 2) Owner-side trip 모니터 (W12 미해결분)
- `(owner)/trip/[id]` 신규 — 진행 중 trip 상세 (학생별 탑승 상태, 정류장 timeline, 안전점검)
- `requireOwnerTripAccess` 헬퍼 (orgId 검증)
- 실시간 broadcast subscribe (Realtime channel)

### 옵션 3) Notification 카테고리 SHUTTLE_NEAR_CHILD 추가
- BoardingType 확장 (NO_SHOW/NO_DROPOFF)
- 미탑승·미하차 BottomSheet UI
- 학부모·학원에 즉시 푸시

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
