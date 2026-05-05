# 셔틀이 진행 현황

> **이 문서는 세션 중간에도 업데이트되어 웹/앱 클로드 코드로 이어갈 수 있게 함**
> 마지막 업데이트: 2026-05-04 (W18+ 베타 직전 sweep — 한글화·loginId·데이터 고도화·env 가드)

## 완료된 마일스톤

| 단계  | 내용                                                                             | 커밋                 | 배포 |
| ----- | -------------------------------------------------------------------------------- | -------------------- | ---- |
| W1~W7 | 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육     | `e224bf6`            | ✅   |
| W8    | 마케팅 랜딩 + 사전등록 + admin                                                   | `b830a72`            | ✅   |
| W9    | 학부모 home + trip-live 디자인                                                   | `16c9805`            | ✅   |
| W10   | Notification 모델 + StopChangeRequest + 결석 반려 + 학부모/owner 워크플로우      | `abb8a5b`, `00f07eb` | ✅   |
| W11   | 기사 화면 디자인 (mobile-first + dark gradient running header + tokens)          | `b4cb872`            | ✅   |
| W12   | 학원장 dashboard 재구성 + 실시간 운행 모니터 + owner 토큰 마이그레이션           | `f87e566`            | ✅   |
| W13   | 마케팅 랜딩 디자인 + /pricing 신규 + login/signup 디자인                         | `dc75d7a`, `a1b41a4` | ✅   |
| W14   | 학부모 invite 디자인 + notification-toggle 토큰화·시각 강화                      | `7776d9b`            | ✅   |
| W15-A | Owner-side trip 상세 view + parent-invite 줄바꿈 수정                            | `e71961f`            | ✅   |
| W15-B | BoardingType NO_SHOW/NO_DROPOFF + 미탑승·미하차 보고 UI + 푸시                   | `a2bf51b`            | ✅   |
| W15-C | 약관·개인정보처리방침 + 가입 동의 link                                           | `3c41c2a`            | ✅   |
| W15-D | 비밀번호 재설정 흐름 (`/forgot-password` → `/reset-password`) + client env 수정  | `684315a`            | ✅   |
| W16   | 학원장 trip 상세 실시간 자동 갱신 (Realtime broadcast + router.refresh)          | _이번_               | ⏳   |
| W16-B | 학원장 trip 상세 실시간 GPS 지도 (`useTripBroadcast` 재사용)                     | _이번_               | ⏳   |
| W17-A | Supabase 비밀번호 재설정 메일 한국어 템플릿 (`supabase/templates/recovery.html`) | _이번_               | ⏳   |
| W17-C | 학부모 BottomTabBar (홈·알림·결석·정류장 4탭)                                    | _이번_               | ⏳   |
| W16-C | 종료 운행 GPS 경로 (LocationPing trail polyline)                                 | _이번_               | ⏳   |
| W17-D | 기사·동승자 trip 화면 실시간 자동 갱신 (`TripRealtimeRefresher` 공용화)          | _이번_               | ⏳   |
| W16-D | 학원장 dashboard 실시간 자동 갱신 (`org-trips:<orgId>` 채널)                     | _이번_               | ⏳   |
| W17-E | `SHUTTLE_NEAR_CHILD` 알림 카테고리 + 안전운행기록 PDF에 GPS 누적거리             | _이번_               | ⏳   |

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

## W14 완료 (학부모 가입 흐름 디자인 + notification-toggle)

### 결과

- `parent-invite/[token]/page.tsx`: 에러 카드 3종 (유효하지 않음/이미 사용/만료) 디자인 토큰
  - Logo + 둥근 카드 + 아이콘 + "로그인 페이지로" 버튼
- `parent-invite/[token]/accept-form.tsx` 풀 재설계:
  - 셔틀이 로고 헤더
  - 초대 정보 카드 (기관·보호자·자녀 3 row, 토큰 색상 구분)
  - 가입 폼 (이메일·비밀번호·동의 체크) — `has-[:checked]:border-bus` 시각 강조
  - "가입하고 자녀 운행 보기" 큰 버튼 (Check 아이콘)
- `components/notification-toggle.tsx` 풀 재설계:
  - 5종 상태별 카드 (loading / unsupported / denied / subscribed / unsubscribed)
  - 각 상태 토큰화 (success-soft / warning-soft / bus-soft / muted)
  - Bell·BellOff·Check·Info 아이콘
  - subscribed 상태에서 success-soft + Check + 해제 버튼 inline
  - unsubscribed에서 bus-soft + 큰 "알림 켜기" 버튼

### W14에서 의도적으로 미수행 (다음 단계)

- 폰 OTP 인증 — Supabase phone auth + SMS provider (BlueMs/Toast/Twilio) 설정 필요
- 비밀번호 재설정 흐름 — `(auth)/forgot-password`
- 약관·개인정보처리방침 페이지 — `(marketing)/(legal)/terms`, `/privacy`

## W15-A 완료 (Owner trip 상세 view)

### 결과

- `lib/auth/owner-trip-access.ts` 신규 — `requireOwnerTripAccess(tripId)` 헬퍼
  - vehicle.orgId 비교로 다른 학원 trip 차단
- `(owner)/dashboard/trip/[tripId]/page.tsx` 신규 — read-only 운행 상세
  - 헤드 카드: running=dark gradient + LIVE / scheduled·finished=white
  - 진행 통계 grid (탑승·하차 / 결석 / 남은 인원) — running 강조 dark/white 분기
  - 운행자 카드 (기사 + 동승보호자, tel: link, KIDS 모드 동승 미지정 경고)
  - 안전점검 (KIDS 모드만, 3개 항목 ✓/✗)
  - 정류장 timeline (border-l-2 left rail + 학생별 처리 상태 + 시각 표시)
- dashboard running card link 복원 — `/dashboard/trip/${tripId}`로 이동 + "상세 보기 →"
- finished 카드도 link화 (요약·안전점검 확인용)

### 부가 수정 (사용자 요청)

- parent-invite 에러 카드 body 줄바꿈 2줄로 (ReactNode + `<br />`)
- ErrorCard `body` 타입 string → React.ReactNode

### 미수행 (다음 단계)

- 실시간 자동 갱신 (Realtime broadcast subscribe) — 현재는 페이지 새로고침 필요
- 운행 종료 후 LocationPing 경로 시각화 (안전운행기록 면책 자료)

## W15-B 완료 (BoardingType NO_SHOW/NO_DROPOFF)

### 결과

- prisma migration `20260503201957_boarding_type_no_show_no_dropoff` — enum 확장
- `(driver)/run/actions.ts` 신규 액션:
  - `markBoardingIssueAction` — 미탑승·미하차 등록 + 학부모·학원장 즉시 푸시
  - `unmarkBoardingIssueAction` — 해제 (실수 누름 대응)
- `(driver)/trip/[id]/trip-screen.tsx` — issue 정보 BoardingRow에 전달
- `(driver)/trip/[id]/trip-running-view.tsx`:
  - BoardingRow 우측에 빨간 ⚠️ 버튼 (미탑승/미하차 보고)
  - 클릭 시 모달 다이얼로그 (사유 textarea, 200자, 한국어 placeholder)
  - issue 마크된 학생은 destructive 카드로 표시 + "해제" 버튼
- `(owner)/dashboard/trip/[tripId]/page.tsx`:
  - 진행 통계의 "남은 인원"에서 issue 차감
  - 미탑승·미하차 경고 배너 (발생 시 destructive border-2)
  - 정류장 timeline에서 issue 학생 우선 표시 (border-2 destructive + 사유 + 시각)
- 푸시 카테고리 활용: STUDENT_NO_SHOW / STUDENT_NO_DROPOFF (이미 enum 존재)

### 푸시 흐름

1. 기사가 정류장에서 학생 안 보임 → ⚠️ 보고 → 사유 입력 → 보고
2. `markBoardingIssueAction` 실행:
   - BoardingEvent {type:NO_SHOW/NO_DROPOFF, notes:reason} 저장
   - student.guardians 모두에게 sendToGuardian fan-out (URL: /home)
   - sendToOwnersOfOrg(student.orgId) — 학원장 모두에게 (URL: /dashboard)
3. 학부모·학원장 알림 인박스 + 푸시 동시 도착

## W15-C 완료 (약관·개인정보처리방침)

### 결과

- `(marketing)/_components/legal-shell.tsx` 신규 — 공용 shell
  - LegalShell (헤더 + Hero + 본문 + 푸터)
  - LegalSection / LegalList helpers
- `(marketing)/terms/page.tsx` 신규 — **이용약관** 12조
  - 목적 / 용어 / 서비스 / 계약 성립 / 회원·회사 의무 / 요금 / 이용 제한 / 책임 한계 / 해지 / 분쟁 / 개정
  - "베타 임시본 — 정식 출시 전 법무 검토 예정" 배지
- `(marketing)/privacy/page.tsx` 신규 — **개인정보처리방침** 12항
  - 처리 목적 / 수집 항목 / 위치정보 별도 고지 / 보유 기간 (운행 데이터 3년)
  - 제3자 제공 / 처리 위탁 (Supabase·Vercel·Kakao·Web Push)
  - 권리·의무 / 미성년자 / 안전성 조치 (RLS, 서비스 롤 키 서버 전용)
  - 쿠키 / 보호책임자 / 변경
- middleware: `/terms`, `/privacy` PUBLIC_PATHS 추가
- footer: 랜딩·pricing 푸터에 이용약관·개인정보처리방침 link 추가
- 가입 동의:
  - `(auth)/signup`: 이용약관·개인정보처리방침 동의 체크박스 (필수, has-[:checked]:bg-bus-soft 강조)
  - `parent-invite/[token]/accept-form`: 동의 문구에 두 페이지 link 추가

## W15-D 완료 (비밀번호 재설정)

### 결과

- `(auth)/forgot-password/page.tsx + forgot-form.tsx + actions.ts`:
  - 이메일 입력 → `supabase.auth.resetPasswordForEmail` 호출
  - redirectTo: `${proto}://${host}/reset-password` (production·preview·local 모두 대응)
  - 보안: 가입 여부 무관 항상 success 응답 (계정 enumeration 방지)
  - success 카드 (success-soft + Check) — "재설정 메일을 보냈어요"
- `(auth)/reset-password/page.tsx + reset-form.tsx + actions.ts`:
  - 4-state UI (loading / ready / expired / success)
  - hash fragment 또는 query code 둘 다 처리:
    · Implicit flow: `#access_token=...&refresh_token=...&type=recovery` → setSession
    · PKCE flow: `?code=...` → exchangeCodeForSession
    · 모두 없으면 expired
  - `supabase.auth.updateUser({password})` 호출
  - 성공 후 2.5초 뒤 자동 `/login` redirect
- middleware: `/forgot-password`, `/reset-password` PUBLIC_PATHS 추가
- `(auth)/login/login-form.tsx`: "비밀번호 찾기" link 추가 (가입하기 옆)

### 부수 수정

- **lib/supabase/client.ts**: `env` proxy → `process.env` 직접 사용
  - 기존: `env.NEXT_PUBLIC_*` 호출 시 proxy가 server-only 변수까지 검증해 client에서 throw
  - 수정: `process.env.NEXT_PUBLIC_*` (Next.js가 client 번들에 inline)
  - 영향: 모든 client-side `createClient()` 호출 (현재는 reset-form만 사용 중)

### 알려진 제약 (운영 정착 후)

- 이메일 발송은 Supabase 기본 SMTP 사용 (베타 한정 무료, 시간당 한도 있음).
  정식 운영 시 SendGrid/Mailgun 등 SMTP 설정 필요.
- 이메일 템플릿은 Supabase 대시보드에서 별도 커스터마이즈 (현재 기본 영문)

## W16 완료 (학원장 trip 상세 실시간 자동 갱신)

### 결과

- `lib/geo/realtime.ts`: 기존 `trip:<tripId>` 채널에 `update` 이벤트 추가.
  ping(5초 GPS broadcast)와 같은 채널을 공유하지만 event 이름으로 분기.
  payload: `{ tripId, reason: "boarding"|"issue"|"safety"|"trip-state", at: ISO }`
- `lib/geo/publish-trip-update.ts` 신규 — server-only.
  Supabase Realtime broadcast HTTP API (`/realtime/v1/api/broadcast`)로
  fire-and-forget. timeout 2s, 실패 시 throw 안 함 (revalidatePath fallback).
- `lib/geo/use-trip-updates.ts` 신규 — client.
  `update` 이벤트 구독 → 400ms debounce 후 onUpdate 콜백 호출.
  여러 변동이 몰릴 때(예: 정류장에서 학생 5명 연속 탑승) 1번만 refresh.
  반환: 최신 payload (UI 인디케이터용).
- `(driver)/run/actions.ts`: 6개 액션 직후 publishTripUpdate 호출:
  - startTripAction/endTripAction → "trip-state"
  - upsertSafetyCheckAction → "safety"
  - toggleBoardingEventAction → "boarding"
  - markBoardingIssueAction/unmarkBoardingIssueAction → "issue"
  - assignHelperAction → "trip-state"
- `(owner)/dashboard/trip/[tripId]/_components/trip-realtime-refresher.tsx`
  신규 — 운행 중일 때만 마운트.
  router.refresh()로 server component 재실행 → 최신 데이터로 다시 그림.
  변동 발생 시 화면 하단 "실시간 갱신 — {reason}" 토스트 표출 (animate-in).
- `(owner)/dashboard/trip/[tripId]/page.tsx`: isRunning일 때만 refresher
  마운트, 종료된 운행은 정적 (불필요한 채널 점유 회피).
  하단 안내 문구 "실시간 자동 갱신됨"으로 갱신.

### 디자인 결정

- **이벤트 payload는 가볍게** — 어떤 데이터가 변했는지 자세히 보내지 않음.
  client가 router.refresh() 트리거만 받고 server component가 다시 fetch.
  단일 source of truth + 기존 렌더링 로직 100% 재사용.
- **broadcast HTTP API 선택** — 서버에서 channel.subscribe→send→removeChannel
  은 매번 250~500ms 들어 server action이 느려짐. HTTP API는 fire-and-forget
  ~50ms.
- **revalidatePath 유지** — broadcast 실패 시 fallback. 다음 페이지 진입은
  어쨌든 fresh data로.
- **운행 중일 때만 구독** — 종료·예정 trip은 변동 없으니 채널 미점유.

### 알려진 제약 / 다음 단계

- LocationPing(GPS)는 학원장 화면에서 아직 시각화 안 함. trip detail에
  실시간 지도 보려면 useTripBroadcast(ping)와 kakao map 통합 필요.
  → W16-B 후속 검토.
- Supabase 측에서 Realtime broadcast HTTP API가 비활성화돼 있으면
  fetch 가 실패 → 사용자는 새로고침해야 갱신. 운영 시 Supabase 대시보드에서
  Realtime 설정 확인 필요.

## W16-B 완료 (학원장 trip 상세 실시간 GPS 지도)

### 결과

- `(owner)/dashboard/trip/[tripId]/_components/owner-trip-live-map.tsx`
  신규 — `useTripBroadcast(tripId)`로 5초마다 ping 받아 `TripLiveMap` 재사용.
  학원장은 child-stop 강조 없이 모든 정류장 동등.
- `(owner)/dashboard/trip/[tripId]/page.tsx`:
  - 운행 중일 때만 라이브 지도 카드 마운트 (head 카드 바로 아래)
  - LIVE 뱃지 + "기사 폰 GPS · 약 5초마다 갱신" 캡션
  - `liveMapStops` server-side derive: `isPassed` = 학생 1명이라도 처리됐으면 회색
  - height 48vh — 운행자·안전점검·timeline은 스크롤로 도달

### 디자인 결정

- **`TripLiveMap` 100% 재사용** — 학부모용으로 만든 컴포넌트가 props로
  child-stop 플래그를 받게 돼 있어 그대로 사용 가능. 학원장은 전부 false.
- **운행 중에만 표시** — 종료된 trip의 정적 경로 시각화는 W16-C로 미룸.

## W17-A 완료 (Supabase 비밀번호 재설정 메일 한국어)

### 결과

- `supabase/templates/recovery.html` 신규 — Pretendard 기반 셔틀이 브랜드
  HTML. 노란 로고 뱃지 + 큰 다크 CTA 버튼 + fallback 링크 + 1시간 유효 안내.
  `{{ .ConfirmationURL }}` 토큰만 사용 (Supabase가 1회용 link로 채움).
- `supabase/config.toml` — `[auth.email.template.recovery]` 블록 활성화,
  subject "[셔틀이] 비밀번호 재설정 안내".

### 적용 방법 (운영자가 수동으로 1번)

1. `supabase login` (서버에 인증)
2. `pnpm sb:link` (이미 project-ref 등록됨)
3. **Supabase 대시보드** → Authentication → Email Templates → Recovery 탭에서
   `recovery.html` 내용 붙여넣기 + Subject 수정.
   (CLI 측 `supabase config push`가 templates 동기화를 아직 GA 지원 안함)

### 영향 범위

- W15-D `(auth)/forgot-password` 흐름이 `resetPasswordForEmail` 호출
  → 이 템플릿으로 메일 발송됨.
- 가입 confirmation은 `admin.createUser({ email_confirm: true })`로 bypass
  중이므로 confirmation.html은 W17-B로 미룸.
- magic_link, invite는 우리가 자체 토큰 흐름 사용 → 템플릿 불필요.

## W17-C 완료 (학부모 BottomTabBar)

### 결과

- `(parent)/parent-bottom-tabs.tsx` 신규 — client. usePathname으로 active
  tab 강조. 4탭: 홈 / 알림 (unread 뱃지) / 결석 / 정류장.
  - 자식 path도 active 처리 (예: `/my-absences/new`도 결석 active)
  - 활성 tab 위에 bus 토큰 underline 작은 라인
  - safe-area-inset-bottom 패딩 (iPhone Home indicator 대응)
  - z-30 — trip-live 풀스크린(z-50)이 가림 (의도)
- `(parent)/layout.tsx` — `<ParentBottomTabs unreadCount={..} />` 마운트.
  layout이 이미 `flex-col` + `min-h-[100dvh]` 이라 sticky bottom으로 자연스럽게.

### 디자인 결정

- "설정" 별도 라우트 없음 → 기존 헤더 dropdown 유지 (W14 디자인).
  4탭으로 축약하는 게 모바일 가독성 우선.
- 홈은 `/home` exact match가 아닌 prefix 매칭 — `/home/anything` 도 active.

## W16-C 완료 (종료 운행 GPS 경로)

### 결과

- `lib/map/trip-live-map-inner.tsx`: `trail?: {lat,lng}[]` prop 추가.
  주어지면 노선 polyline 위에 노란 굵은 선(`#f5c518`, weight 5, opacity 0.85)
  으로 실주행 경로 overlay. 캡션도 "운행 경로 N개 좌표" 분기.
- `(owner)/dashboard/trip/[tripId]/page.tsx`:
  - `isFinished`일 때 `db.locationPing.findMany`로 trail 추가 fetch
  - 실주행 카드 신설 (header: "완료 (N개 좌표)" + 면책 자료 캡션)
  - `<TripLiveMap shuttle={null} trail={trail} />` 직접 사용 (broadcast 불필요)

### 의도

- 안전운행기록(별지 제20호의2) PDF에 포함하기 전 화면 검증용.
- 시각적 경로 + 정류장 통과 시점이 일치하는지 학원장이 확인 가능.

## W17-D 완료 (기사·동승자 trip 화면 실시간 자동 갱신)

### 결과

- `components/trip-realtime-refresher.tsx` (이전 owner 전용에서 이동) —
  공용 컴포넌트화. owner page는 import 경로만 수정.
- `(driver)/trip/[id]/trip-screen.tsx`:
  - 진행 중 trip 분기에 `<TripRealtimeRefresher tripId={trip.id} />` 마운트
  - driver와 helper가 같은 화면을 공유하므로 둘 다 혜택
  - 본인이 publish 한 update도 받지만 router.refresh가 같은 server data 다시
    로드 → no-op. 불필요한 refresh 비용 무시 가능.

### 영향

- 학부모 trip-live는 그대로 (별도 사실상 broadcast만 사용)
- 학원장 → 기사 → 동승자 전 채널이 같은 `trip:<tripId>` "update" 이벤트 공유

## W16-D 완료 (학원장 dashboard 실시간 자동 갱신)

### 결과

- `lib/geo/realtime.ts`: `ORG_TRIPS_CHANNEL_PREFIX = "org-trips"` +
  `orgTripsChannelName(orgId)` 추가.
- `lib/geo/publish-trip-update.ts`: optional `orgId` 매개변수.
  주어지면 single HTTP request에 trip 채널 + org 채널 두 메시지를 함께 발행
  (multi-message body) — 한 번의 fetch로 학원장 trip 상세 + dashboard 모두 갱신.
- `lib/geo/use-org-trips-updates.ts` 신규 — 600ms debounce(여러 trip이
  동시에 변동될 가능성 높아 trip-level보다 길게).
- `components/org-dashboard-refresher.tsx` 신규 — 학원장 dashboard 마운트용.
  "운행 모니터 갱신됨" 토스트.
- `(driver)/run/actions.ts`: 6개 publishTripUpdate 호출 모두 orgId 전달
  - `revalidatePath("/dashboard")` 추가 (broadcast 실패 시 fallback).
- `(owner)/dashboard/page.tsx`: `<OrgDashboardRefresher orgId={orgId} />` 마운트.

### 디자인 결정

- **Org 채널 단일 구독** — dashboard가 trip을 N개 보지만 trip마다 채널
  구독하면 새 trip 추가 시 못 받음. org 채널 1개로 단순화.
- **600ms debounce** — 여러 기사가 동시에 운행 시작/종료 시 burst 방지.
- **Multi-message HTTP body** — 1번의 broadcast로 2채널 동시 발행, 추가 latency 없음.

## W17-E 완료 (SHUTTLE_NEAR_CHILD 카테고리 + PDF GPS 거리)

### 결과

- `prisma/schema.prisma`: `NotificationCategory` enum에 `SHUTTLE_NEAR_CHILD`
  추가 + `prisma/migrations/20260503210000_notification_shuttle_near_child` 신규.
- `(driver)/run/actions.ts`: `notifyGuardiansOfStopPass`가 ANNOUNCEMENT 대신
  새 카테고리 사용 — 인박스에서 일반 공지와 분리됨.
- 학부모·기사·학원장 `notification-list.tsx` 3곳 모두 type union + ICON_BY_CAT
  맵 갱신 (Bus 아이콘).
- `lib/pdf/safety-report-data.ts`: trip마다 LocationPing 가져와 haversine으로
  누적 거리 계산. row에 `gpsDistanceKm` / `gpsPingCount` 추가, vehicle에
  `totalDistanceKm` 추가.
- `lib/pdf/safety-report.tsx`: vehicle meta에 "누적 운행거리 X km" 표시,
  비고 컬럼이 GPS 데이터 있으면 "X.Xkm · N회 ping"으로 자동 채움.

### 의도

- 셔틀 도착 알림이 결석/공지 등 일반 알림과 시각적으로 분리되어 학부모가
  "지금 자녀 정류장으로 오는 중"임을 즉시 인지.
- 분기 PDF에 GPS 누적 거리를 함께 명시해 면책 자료의 정량성 강화.

### 운영자 액션

- DB에 마이그레이션 적용: `pnpm db:migrate deploy` (운영) 또는
  `pnpm db:migrate dev` (로컬).

## W18 베타 직전 패키지 (2026-05-04)

이번 세션 누적 22+ 커밋. 베타 운영 직전 안정화·UX·정책 정리.

### W18-A 안전교육 이수증 Storage (`ba3e1bc`)

- Supabase Storage `training-certificates` 버킷 (Private + signed URL).
- TrainingRecord에 `certificateFile String?` 컬럼 추가 (`certificateUrl`은 외부 URL용 그대로).
- 가입 폼에 모드 토글: "첨부 안 함 / 외부 URL / 파일 업로드".
- PDF·JPG·PNG, 5MB 제한. magic-byte 검증으로 .exe rename 차단.
- Next.js 16 server action body 한도 `bodySizeLimit = '6mb'` (5MB + multipart 여유).
- 신규 `getCertificateSignedUrlAction(recordId)` 1시간 임시 link.
- `deleteTrainingRecordAction` 확장 — DB delete 전 Storage cleanup.

### W18-B NO_SHOW 시나리오 강화 (`40d0e74`, `1fec2ab`, `ad34629`)

- **S1 운행 종료 강제 모달** (driver): 미처리 학생 1명이라도 있으면 종료 차단.
  학생별 `[탑승]` / `[미탑승 보고 + 사유]` 처리해야 종료 가능.
- **S2 학원장 KPI 카드** (dashboard): "오늘 미탑승·미하차 N건" — destructive
  pulse + 주 보호자 이름·전화번호 같이 표시.
- **M1 정류장 통과 60s 강조** (driver): 통과 후 60초 미처리 학생 노란 ring +
  "처리 누락" 배지 + animate-pulse.
- **M2 학부모 빠른 응답** (parent): NO_SHOW 알림에 "지금 데려다 드릴게요" 버튼.
  응답 시 기사·학원장에게 즉시 푸시 (오늘 진행 중 NO_SHOW 보고 자동 매칭).

### W18-C 성능 최적화 (`9810be2`, `0f1e997`)

- **Prisma pooler 전환**: `lib/db.ts`의 connectionString을 DIRECT_URL(5432) →
  DATABASE_URL(6543 transaction pooler, `pgbouncer=true`). Vercel cold start
  TLS handshake 절감, connection 한도 회피.
- **쿼리 병렬화**: owner dashboard 5개 sequential await → Promise.all (4개 묶음 +
  boardingEvent 의존만 그 후), parent home 3개 sequential → Promise.all.
- **DB 인덱스 10개**: Staff/Guardian(userId)·Vehicle/Staff/Stop/Student(orgId)·
  Route(vehicleId)·RouteStudent(studentId)·Trip(driverId,date)·BoardingEvent(tripId,type).
- **Geist_Mono 제거**: 한국어 앱이라 미사용. layout.tsx에서 import 제거,
  globals.css의 `--font-mono`는 시스템 monospace로 fallback.

### W18-D 인증 식별자 도입 (`367fb3b`, `d7062df`)

- **loginId**: Staff·Guardian·StaffInvite·GuardianInvite에 `loginId String? @unique`.
  영문·숫자·_ 4~20자. Supabase Auth는 placeholder 이메일 `${loginId}@shuttlee.local`
  로 저장 (외부 SMTP 라우팅 불가, RFC 6762 mDNS 예약).
- **recoveryEmail**: Staff·Guardian에 `recoveryEmail String?`. 가입 시 입력하면
  그 이메일이 Auth user.email이 되어 본인이 `/forgot-password`에서 reset 메일 수신.
  미입력자는 학원장 admin reset만 가능.
- **로그인 폼 통합**: 단일 input "이메일 또는 로그인 아이디" — `@` 포함이면 이메일,
  아니면 loginId → DB lookup으로 placeholder 또는 recoveryEmail 매핑.
- **초대 흐름**: 학원장이 발급 시 loginId 직접 입력 또는 `suggestLoginId()` 자동
  추천. 가입자는 비번·(선택)recoveryEmail만 입력.
- **비번 초기화**: `/staff`·`/guardians` 학원장 페이지에 [비번 초기화] 버튼.
  `admin.auth.admin.updateUserById`로 임시 비번 8자 발급 → 학원장이 카톡 공유.

### W18-E 데이터 고도화 (`603b974`, `6583d10`)

- **#1 NO_SHOW 빈도 학생 탐지** (dashboard): 최근 30일 3건 이상 학생 + 주 보호자
  연락처 표시. 학원장이 학부모 면담 trigger.
- **#10 SaaS 운영 KPI** (`/admin/kpi`, 화이트리스트): 등록 학원·학생·차량·
  최근 30일 운행·NO_SHOW 비율·요금제·기관 유형 분포.
- **#2 ETA 정시성 분석** (학부모 trip-live): `lib/eta/route-stats.ts`의
  `getRouteStopArrivalStats()` — Trip.startedAt 기준 정류장별 평균 통과 분.
  sample ≥ 3건 누적되면 "예상 HH:mm 도착 (정시 대비 +N분)" 표시,
  부족하면 RouteStop.scheduledAt 기반 fallback.

### W18-F 사용자 노출 영어 한글화 (`cca9fac`, `cfcb616`, `3b58c42`, `8cb83d9`, `c2bdaf2`, `3571df0`)

베타 사용자는 비-IT 친화적인 학원장·기사·학부모. 영어 단어 노출이 마찰.

- KIDS·GENERAL → 어린이용·일반용 (mode-badge·routes·students·safety-report PDF)
- OWNER → 학원장·원장 (driver-notification-toggle·staff actions 에러)
- LIVE → 운행 중 (4곳: marketing hero mock·home·trip-live·owner trip 상세)
- ETA → 도착 예상
- 도교법 → 도로교통법 (사용자 노출 + 코드 주석)
- GPS → 위치 (driver "위치 수신중", owner trip "기사 폰 위치"; 약관 페이지는
  "위치 정보를 기반으로"로 풀어쓰기)
- PWA → 앱 설치 없이 바로 사용
- iOS Safari → 아이폰 사파리
- Lite/Standard/Pro → 라이트/스탠다드/프로
- Web Push → 푸시 알림·브라우저 표준
- broadcast → 실시간 위치 전송
- LocationPing 테이블 → 위치 기록 데이터베이스
- User Agent → 브라우저 종류·버전
- endpoint → 구독 주소
- ON/OFF → 켜짐/꺼짐
- 기술 약어들도 외래어 표기 (CDN → 콘텐츠 전송 네트워크)

코드 enum/주석/throw Error는 stack trace용 개발자 로그라 영어 유지.

### W18-G UX·UI 폴리싱 (`cfcb616`, `36ea4e3`, `c665a60`, `01c4342`)

- **헤더 짤림 fix**: OwnerHeader·DriverHeader·ParentHeader DropdownMenuContent에
  `min-w-[220px]` + 이메일 p에 `break-all`. loginId placeholder 이메일도
  `.local`까지 안 잘림.
- **Vercel Speed Insights 활성화**: `@vercel/speed-insights/next`로 TTFB·LCP·INP
  자동 수집.
- **정류장 좌표 한 컬럼 + 4자리**: `/stops` 페이지에서 위도·경도 두 컬럼(6자리)
  → "좌표" 한 컬럼(4자리, 약 11m 정확도). 학원장이 좌표 직접 검토할 일 거의 없음.
- **한국어 줄바꿈**: globals.css `body { word-break: keep-all; overflow-wrap:
  break-word; }` 글로벌 적용. "별/지" 단어 중간 끊김·"다." orphan 방지.
- **날짜 입력 연도 차단**: `<input type="date">` 4자리 초과 연도(예: 262026)
  허용 이슈. client `min/max="2099-12-31"` + server zod refine 이중 차단.
  vehicle 보험 만료일·absence·stop-change·training 모두 적용.
- **차량 모드 안내문**: "어린이도 태우나요?" 질문형 + helper text "병행 운영도
  어린이용으로 등록 (도로교통법 의무)".
- **필수 필드 빨간 ***: shadcn Label에 `required` boolean prop 추가. vehicle-form
  적용 (다른 폼은 점진).
- **표 카드 위·아래 여백 제거**: shadcn Card 기본 `py-4`가 Table 위·아래 16px
  여백 만듦. owner Table 6개 페이지에 `<Card className="py-0">`.
- **정류장 등록 검색·내 위치** (`2821ee0`): 위도·경도 직접 입력 input 제거
  (학원장이 좌표를 직접 알 일 거의 없음). 카카오 services.Places.keywordSearch
  로 키워드(장소·주소) 검색 → 결과 list 5개. navigator.geolocation으로 "내
  위치" 버튼 — enableHighAccuracy. 작은 caption으로 현재 좌표 4자리만 참고용.
- **내 위치 정확도 표시·안내**: 데스크톱 브라우저는 GPS 없이 WiFi/IP fallback
  으로 100m~수km 오차 발생 (사용자 보고). geolocation timeout 20s + maximumAge:
  0으로 sample 강화. 결과의 `coords.accuracy`를 "약 ±50m" 형태로 표시,
  100m 초과 시 "데스크톱은 부정확. 검색·지도 클릭으로 보정" 안내 자동 노출.
- **검색 결과 dropdown floating**: 기존엔 결과 list가 같은 column에 위에 위치
  → 결과 표시 시 지도가 아래로 밀려 스크롤 필요. relative wrapper +
  `absolute top-full z-20`로 검색 input 바로 아래에 dropdown 형태 overlay.
  지도 본체는 항상 같은 자리. "검색 결과 N건" 헤더 + ✕ 닫기 버튼,
  Esc 키로도 닫힘. max-h-64 overflow-y-auto.
- **좌표 → 주소 (reverse geocoding)**: 사용자에게 위도·경도(35.8881, 128.5910)
  같은 숫자는 알아보기 어렵다는 피드백. Stop 모델에 `address String?` 컬럼
  추가 (migration `20260504200000_stop_address`). stop-map-picker-inner이
  카카오 `services.Geocoder.coord2Address`로 좌표 변경마다 reverse geocode
  → onAddressChange callback. stop-form은 hidden input으로 form submit에
  포함, "현재 위치" 카드에 도로명·지번 주소 표시. /stops 목록 좌표 컬럼도
  주소 컬럼으로 교체. academy-app 참고하여 검증된 패턴 (네이버 SDK도
  reverseGeocode 동일 흐름).

### W18-H Layout 진입 가드 redirect (`c9befca`, `1246bff`)

- (parent)·(driver)·(helper)·(owner) layout 모두 동일 패턴:
  - `getCurrentUser()` null → guardian이면 `/home`, 없으면 `/login?redirectTo=...`
  - 다른 role이면 `homePathForRole(role)`로 본인 home redirect
- 이전엔 `requireOwner/Driver/Helper/Guardian()` throw가 영어 stack trace를
  사용자에게 노출 가능했음. 이제 사전 redirect로 차단.

### W18-I 정류장 등록 env 에러 fix (`309d049`)

- 증상: `/stops/new` 진입 시 "Invalid environment variables: {}" 에러.
- 원인: `lib/env.ts` Proxy가 server-only 변수까지 zod 검증 → client component
  (stop-map-picker-inner.tsx, trip-live-map-inner.tsx)에서 호출 시 throw.
- fix: client에서 `env.NEXT_PUBLIC_KAKAO_MAP_KEY` → `process.env.NEXT_PUBLIC_KAKAO_MAP_KEY`
  직접 사용 (Next.js 빌드 타임 inline).
- **재발 방지**: `lib/env.ts`에 `import "server-only";` 추가 — client에서 import
  시도 시 빌드 시점 차단.

### W18-K 드롭다운·학년 선택기 (이번 커밋)

- **shadcn Select 도입**: 기존 native `<select>` 8곳 모두 radix Select 기반
  shadcn 컴포넌트로 교체. 사용자 피드백 "버튼은 라운드인데 드랍다운은 직사각형
  이라 굉장히 디자인적으로 어색함" 반영. 닫힘 상태 + 열림 popover 모두 디자인
  토큰 + `rounded-md`/`rounded-lg` 일관 적용.
  - 적용 파일: `routes/[id]/edit/route-stops-section`, `routes/_components/route-form`,
    `students/[id]/edit/route-students-section`, `students/_components/student-form`,
    `parent/my-absences/new/absence-form`, `parent/my-stop-changes/new/stop-change-form`,
    `driver/trip/[id]/trip-running-view` (HelperPicker), `owner/safety-report/report-download-form`,
    `marketing/pre-register-form`.
  - `route-form` vehicle option label `[GENERAL]/[KIDS]` → `[일반용]/[어린이용]`
    한글로 동시 교체 (사용자 피드백 "여전히 영문 혼재함").
  - radix Select는 빈 문자열 value 금지 — HelperPicker "동승자 없음"은 `__none__`
    sentinel로 우회.
- **학년 → 출생연도 자동 산출**: 사용자 피드백 "출생연도 말고 학제/학년으로 판단할
  수 있도록". `student-form`에서 18개 학제·학년 옵션 (미취학 만 3-7세, 초1~6,
  중1~3, 고1~3, 대학생·성인) Select + 직접입력 fallback. offset 매핑으로
  `birthYear = CURRENT_YEAR - offset` 자동 계산, hidden input으로 form submit.
  실시간 hint "→ 2019년생 자동 산출 · 어린이용 모드 대상" 표시.

### W18-J seed 확장 + E2E 검증 (`3b58c42`)

- `prisma/seed.ts`에 Supabase Auth user 생성 추가 — demo OWNER·DRIVER·HELPER·
  GUARDIAN×5 (총 8개 계정), 모두 비번 `demo1234!`.
- email pattern: `@shuttlee-demo.local` (OWNER) / `@shuttlee.local` (loginId users).
- cleanup 시 해당 도메인의 Auth users도 같이 삭제 (raw listUsers 페이지네이션).
- 브라우저 자동화로 핵심 흐름 검증 완료:
  1. demo OWNER 로그인 → dashboard·CRUD 페이지·초대 발급 정상
  2. demo_driver 로그인 → /run 진입·운행 시작·NO_SHOW 보고 정상
  3. demo_parent2 로그인 → /notifications NO_SHOW 알림·"지금 데려다 드릴게요"
     응답 → demo OWNER dashboard에 KPI "1" 자동 갱신
  4. 신규 직원 초대 → loginId·recoveryEmail 가입 → 자동 로그인 정상

## W19 학원장 차량 모니터링 강화 (2026-05-05)

베타 운영 중 학원장이 운영 의사결정에 필요한 도구가 부족해서 추가.
세 기능을 한 패키지로 한 번 배포·검증.

### W19-A trip-stats utility + safety-report DRY refactor (`475310e`)

- `src/lib/geo/trip-stats.ts` 신설 — `computeTripStats(pings, startedAt, endedAt)`
  + `computeStopArrivals(pings, stops)` + `formatDuration(sec)` helper.
  durationSec / distanceKm / avgSpeedKmh / maxSpeedKmh / pingCount 한 번에 계산.
- 기존 `src/lib/pdf/safety-report-data.ts`의 자체 for-loop 누적거리 코드를
  `computeDistanceMeters`로 이전. PDF distanceKm 결과는 동일 (regression 0).
- 이후 W19-B~E 커밋이 이 utility 위에서 동작.

### W19-B 운행 중 실시간 trail polyline (`2ffc78e`, `41c698e`)

- 학원장 trip 상세에서 운행 중에도 노란 trail polyline 표시.
- Hybrid 방식: server에서 LocationPing(30s grain) → initialTrail prop으로 전달
  + client에서 broadcast(5s grain) ping을 useState에 append.
- 직전 좌표와 ~5m 이내면 dedup (정지 중 점 누적 방지).
- `src/lib/geo/use-trip-broadcast-with-trail.ts` — 콜백 안에서 setState 하는
  단일 hook. react-hooks/set-state-in-effect 룰 회피.

### W19-C 멀티 trip 라이브 지도 (`41c698e`)

- 학원장 dashboard 상단에 "운행 중 셔틀 위치" 카드 추가, 운행 중 1개 이상일
  때만 자동 표시. 모두 종료 시 섹션 자체 숨김.
- 카카오맵 1개에 N개 셔틀 마커 + 정류장 합집합 + 노선별 polyline.
  마커 클릭 → 해당 trip 상세로 이동.
- 신규: `src/lib/map/multi-trip-live-map-inner.tsx`,
  `src/lib/map/multi-trip-live-map.tsx`,
  `src/app/(owner)/dashboard/_components/multi-trip-live-section.tsx`.
- 각 trip별 broadcast 구독은 mini-component(TripPingFeeder) 패턴 — Rules of
  Hooks 위반 없이 N개 useTripBroadcast 호출.
- dashboard page 수정: Phase 2 Promise.all에 stops fetch 추가, liveMapTrips
  변환, OrgDashboardRefresher 직후 마운트.

### W19-D Trip 상세 통계 카드 + 정류장 도착 시각 표 (`3acc2b3`)

- `TripStatsCard` — 운행 시간 / 누적 거리 / 평균 속도 / 최대 속도 4-grid.
  운행 중·종료 모두. 운행 중은 "지금까지" 누계, 종료 시 최종값.
- `StopArrivalsTable` — 정류장별 도착 시각(STOP_PASS) + 직전 구간 소요 +
  탑승·미탑승 처리 건수. 모바일 카드 stack + 데스크톱 표 (W18 패턴).
- 정류장별 처리 건수는 BoardingEvent를 학생→정류장 매핑으로 derive.
- LocationPing select에 recordedAt/source/speed 추가.

### W19-E /dashboard/analytics 운행 분석 페이지 (`967d8cb`)

- searchParam `?range=7d|30d|90d` (default 30d). 노선별 평균 + 기사별 평균
  두 섹션. 평균 운행 시간·거리·속도, 운행 횟수, 미탑승 누적.
- 신규: `src/lib/analytics/trip-aggregates.ts` — aggregateByRoute /
  aggregateByDriver. computeTripStats 재사용. orgId 필터(vehicle:{orgId})로
  멀티테넌시 준수.
- nav 항목 "분석"(BarChart3) 추가. 안전기록 바로 앞 위치. 항목 11→12개.
- loading.tsx skeleton — aggregate 쿼리 1~2초 대응.

### 사용자 가치

- 차량 N대 학원: 한 지도에서 모든 셔틀 동시 모니터링 가능
- 운행 후: 평균 속도·미탑승 건수 등 객관적 KPI로 기사·노선 성과 비교
- 운행 중: trail polyline으로 "방금 어디 거쳐 왔지?" 즉시 답
- 안전운행기록 PDF의 분기 단위 distanceKm와 동일 utility — 일관성 보장

### W19 검증

- typecheck/lint/build 모두 clean
- /dashboard/analytics 라우트 build 성공
- LocationPing/realtime broadcast/RLS 변경 없음

## W20 UX 풀세트 (2026-05-06)

전체 프로젝트 UX 감사 후 4개 묶음(A·B·C·D)을 추천 순으로 일괄 진행.
한 세션에서 모든 묶음 commit + deploy.

### W20-A 학생 360° + cross-link (`7d5924a`, `ebfdd7c`)

**A1. 학생 상세 페이지 신설** (`/students/[id]`):
- 헤더(연령 배지·이름·편집), 30일 통계 4-grid, 보호자 list(tel: 직접 통화),
  노선·정류장 배정, 30일 BoardingEvent (행 클릭 → trip 상세), 결석·정류장
  변경 history (사유·반려 사유 노출).
- 학생 list 카드/표 행 → /students/[id] 링크 추가. 편집 버튼은 별도.
- 부수: student-form / guardians invite-form 의 `<a href="/students">` →
  `<Link>` 변경 (eslint @next/next/no-html-link-for-pages).

**A2. Trip 상세 cross-link**:
- 기사 이름 → /dashboard/analytics/drivers/[id]?range=30d (StaffRow에
  optional analyticsHref prop).
- 정류장 timeline의 학생 이름 3가지 케이스(NO_SHOW 이슈·결석·일반)
  모두 → /students/[id].

**A3. Dashboard 미탑승 학생 클릭**:
- "최근 30일 미탑승·미하차 잦은 학생" alert 행 전체 → /students/[id].
- 기존 보호자 연락처 노출 유지, hover bg 추가.

학원장 운영 흐름:
컴플레인 받음 → dashboard alert 학생 클릭 → 30일 history·보호자 전화
바로 연결.

### W20-B 인터랙션 풀세트 (`bf65989`)

**B1. 알림 routing 보완**:
- BUG: 학원장 stop-change-requests/actions.ts 가 학부모 push에 url을
  학원장용 `/stop-change-requests`로 잘못 보냄 (승인·반려) → 학부모는
  못 봄. → `/my-stop-changes`로 수정.
- 학부모 notification-list.tsx 에 FALLBACK_URL_BY_CAT — 발송 시 url 없는
  legacy 알림도 카테고리 기준 적절한 곳으로 (ABSENCE_* → /my-absences,
  STOP_CHANGE_* → /my-stop-changes).

**B2. Toast (Sonner) 시스템 통합**:
- 루트 layout에 `<Toaster position="top-center" richColors />` 마운트.
  next-themes로 자동 다크/라이트 대응.
- AckAbsenceButton, RejectAbsenceButton, UnlinkGuardianLinkButton,
  DeleteTrainingButton에 toast.success/error. 기존 alert() 제거.

**B3. error.tsx + not-found.tsx**:
- 신규 src/app/error.tsx — 전역 unhandled error UI. "다시 시도" + "메인" 버튼.
- 신규 src/app/not-found.tsx — 404 안내 + 메인 link.
- 기존 0개 → 2개 추가. Next.js 영문 stack trace 노출 방지.

### W20-C 기사 안정성 (`dc03bdd`)

**C1. 기사 /run 권한 사전 체크 카드**:
- 신규 src/app/(driver)/run/_components/driver-permissions-card.tsx
- 위치 권한 / 알림 권한 / Wake Lock 자동 체크 (Permissions API +
  Notification.permission + 'wakeLock' in navigator).
- 미허용 시 "권한 요청" 버튼 (in-place getCurrentPosition /
  Notification.requestPermission). denied 상태는 자물쇠 가이드.
- 모두 OK면 자동 collapse → "운행 환경 이상 없음" details.

**C2. 학부모 trip-live 기사 직접 통화**:
- driver select에 phone 추가, TripLiveShell driverPhone prop.
- BottomSheet 운행 정보 카드 안에 tel: 링크 버튼 (phone icon + 번호).
- 긴급 시 학부모가 즉시 기사 통화.

**C3. GPS 끊김 복구 안내**:
- gps-tracker hook에 retryKey state + retry() 메서드. effect deps에 retryKey
  포함 → retry() 호출 시 watchPosition 재구독.
- 기존 단일 텍스트 "GPS: error" → 안내 카드 (지하 주차장 안내 + 권한 가이드
  + "GPS 다시 시도" 버튼). 일시적 신호 손실 후 자연스러운 복구.

### W20-D 학부모 자기 추적 (이번 commit)

**D1. 학부모 홈 "내 신청 현황" 카드**:
- HomeActionsGrid 2x2 — Row 1(신청 new): 결석 신청 / 정류장 변경.
  Row 2(현황 list): 내 결석 신청 [대기 N] / 내 정류장 변경 [대기 N].
- home/page.tsx Promise.all에 pendingAbsenceCount + pendingStopChangeCount
  카운트 fetch 추가 (orgId 필터 createdBy=guardian.id).
- 대기 0건이면 배지 안 보임, 1건+ 노란 warning-soft 배지.

**D2. PWA 설치 안내 배너**:
- 신규 src/app/(parent)/home/_components/pwa-install-banner.tsx
- Android Chrome: beforeinstallprompt 이벤트 → "홈 화면에 추가" 버튼.
- iOS Safari: 이벤트 미발생 → "공유 → 홈 화면에 추가" 안내 텍스트.
- 이미 standalone 모드면 표시 X. 사용자 X 닫으면 30일 suppress
  (localStorage).
- 학부모 홈 GreetingSection 직후 마운트.

### W20 사용자 가치 요약

- **학원장**: 컴플레인·미탑승 알림 → 한 클릭으로 학생 360° 상세 + 보호자 전화
- **학원장**: 운영 액션 결과를 toast로 즉시 피드백
- **기사**: 운행 시작 전 권한 누락 사전 발견, 운행 중 GPS 손실 시 명확한 복구 흐름
- **학부모**: 알림이 항상 의도한 곳으로 라우팅, 긴급 시 기사 직접 통화, 신청
  진행 현황 홈에서 한눈에, PWA 설치로 푸시 안정성 ↑

### W20 검증

- typecheck/lint/build 모두 clean
- 신규 4개 라우트(/students/[id], /error, /not-found, 학부모 홈 PWA banner UI)
- Supabase Realtime/RLS/LocationPing 변경 없음

## W21 학원장 메뉴 4종 360° drill-down (2026-05-06)

학생 360°(W20-A)와 같은 패턴을 차량·기사·정류장·학부모 메뉴로 확장. 사용자
지적: "차량메뉴는 편집 밖에 없네?" — 4개 list 페이지 모두 행 클릭이 안 되고
액션이 편집·삭제·비번 초기화에 그쳐서 정보가 흩어져 있음 → 4개 detail 페이지
신규 + list 행 클릭 진입 통일.

### W21-A 차량 360° (`/vehicles/[id]`)

- 헤더: plate·mode 배지(KIDS/GENERAL)·신고증명서·보험만기 + 편집/삭제 버튼.
  보험 만기 60일 이내면 warning 칩, 만료면 destructive.
- 30일 통계 4-grid: 운행 횟수·누적거리·평균속도·미탑승 건수.
  `computeTripStats` (W19) 재사용 + Promise.all 병렬 (vehicle·routes·trips 30일).
- 배정 노선 list (방향 배지·정류장 수·학생 수, link to /dashboard/analytics/routes/[id]).
- 최근 30일 운행 trip list (방향·날짜·시각·노선·기사·통계·미탑승, link to /dashboard/trip/[tripId]).
- KIDS 모드만: 안전점검 미흡 운행 카드 (seatbeltAllOk·allAlightedOk false 필터).
- list page: 카드/표 행 → /vehicles/[id] Link wrap, 편집·삭제 버튼 detail로 이동.

### W21-B 직원 360° (`/staff/[id]`)

- 헤더: name·role 배지·loginId·phone(tel:)·가입상태 + DRIVER에 "상세 운행 분석"
  cross-link (→ /dashboard/analytics/drivers/[id]). 본인이 아니고 OWNER 아니면
  비번 초기화·삭제 버튼.
- DRIVER/HELPER만: 30일 운행 통계 4-grid (운행수·평균시간·평균거리·미탑승).
  query: `vehicle.orgId` + OR `driverId`/`helperId` 필터로 통합. 누계 평균 속도 footer.
- 안전교육 list: 카테고리(운영자/운전자/동승자) + 이수일·만기일.
  만기 30일 이내 warning, 만료 destructive 배지.
- DRIVER/HELPER만: 최근 30일 운행 trip list (driverId 매치 안 되면 "동승" 배지).
- DRIVER만: 안전점검 미흡 운행 (KIDS 모드 운전 책임 분).
- OWNER 본인 진입 시 운행 카드 hide + 분석 페이지 안내.
- list page: 카드/표 행 → /staff/[id] Link wrap, 액션 버튼 detail로 이동.
  대기 중 초대 섹션은 그대로 유지.

### W21-C 정류장 360° (`/stops/[id]`) + 카카오맵 read-only

- 신규 `src/lib/map/stop-map-display{,.inner}.tsx` — picker(검색·내 위치·onPick)
  없는 read-only 표시 컴포넌트. dynamic import wrapper로 SSR-safe.
- 헤더: name·address·반경·좌표 + 편집/삭제 버튼.
- StopMapDisplay 카드 (radiusM 노란 원).
- 4-grid: 사용 노선 수·home 학생 수·30일 변경요청(from)·변경요청(to).
- 사용 노선 list: 방향·노선명·차량·KIDS 배지 → /dashboard/analytics/routes/[id].
  RouteStop join, 순서·예정 시각 표시.
- home 학생 list: 방향·이름·노선 → /students/[id].
- 30일 변경 요청 history: "이 정류장에서/으로" 배지 + 학생 link + 사유·반려.
- list page: 카드/표 행 → /stops/[id] Link wrap, 편집·삭제 detail로 이동.

### W21-D 학부모 360° (`/guardians/[id]`)

- Guardian 모델에 orgId 없음 → `links: { some: { student: { orgId } } }` join
  필터로 본 기관 학생과 link된 보호자만 통과. links도 같은 필터로 본 기관 자녀만.
- 헤더: name·loginId·phone(tel:)·가입상태·recoveryEmail + 비번 초기화 버튼.
- 4-grid: 결석 신청 수·정류장 변경 수·푸시 디바이스 수·마지막 알림 발송.
  push 디바이스 0이고 가입 상태인 경우 destructive (구독 안 함 경고).
- 자녀 list: relation·isPrimary 배지 → /students/[id]. 각 row에
  UnlinkGuardianLinkButton 분리 (anchor nesting 회피).
- 결석·정류장 변경 history: 학생 페이지 패턴 그대로, 학생 이름 link 추가.
- 푸시 디바이스 list: UA 파싱 → 디바이스 라벨 (iPhone/iPad/Android/Mac/Windows/Linux/기타).
- list page: 카드 헤더만 Link wrap (자녀 list와 비번 버튼은 분리).
  데스크톱 표는 이름·loginId·phone·상태 cell만 Link, 자녀·관리 cell은 그대로.

### W21 부수 변경

- `<a href="/internal-route">` → `<Link>` 일괄 변경 (eslint @next/next/no-html-link-for-pages):
  `routes/[id]/edit/route-stops-section.tsx`, `routes/_components/route-form.tsx`,
  `staff/invite/invite-form.tsx`, `stops/_components/stop-form.tsx`,
  `students/[id]/edit/route-students-section.tsx`, `vehicles/_components/vehicle-form.tsx`,
  `guardians/invite/invite-form.tsx`. (sub-route /\[id\] 신규 생성으로 internal로 분류돼 lint 발생.)
- `Date.now()` 사용 제거 — react-hooks/purity (React 19) 위반. `today.getTime()`
  같은 진입 시점 캡처 값으로 변경 (vehicles/staff detail).

### W21 사용자 가치 요약

- **학원장 차량 운영**: 차량 한 대 클릭 → 30일 운행 패턴·노선·안전점검 미흡·
  보험 만기 한 화면.
- **학원장 인사 관리**: 직원 클릭 → 30일 운행·안전교육 만기·미흡 운행. 기사 단위
  분석 페이지 cross-link.
- **학원장 정류장 운영**: 정류장 클릭 → 위치 지도·사용 노선·home 학생·변경 요청
  빈도 (정류장 위치가 부적절한지 판단 가능).
- **학원장 보호자 관리**: 보호자 클릭 → 자녀·결석/변경 history·푸시 구독 상태
  (학부모가 알림 못 받는 이유 즉시 진단).

### W21 검증

- typecheck/lint/build 모두 clean
- 신규 4개 라우트(/vehicles/[id], /staff/[id], /stops/[id], /guardians/[id]) 등록 확인
- 신규 2개 client component(stop-map-display{,.inner}) — dynamic import + SSR-safe
- Supabase Realtime/RLS/LocationPing 변경 없음

## 다음 우선순위 (W22+)

### W17-B: 가입 확인 메일 한국어 (선택)

- Supabase email_confirm bypass 해제 시 필요. 베타 시점은 보류.

### W17: 인증·기능 보강

- 학부모 폰 OTP 가입 (Supabase phone auth + SMS provider)
- 약관·개인정보처리방침 정식 법무 검토
- Supabase 이메일 템플릿 한국어 커스터마이즈

### W18: 결제·요금제

- Toss Payments 또는 Stripe 통합
- Plan 전환 (TRIAL → BASIC → PRO)
- 차량 단위 청구 + 세금계산서

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

| 그룹        | 라우트                                                                                                                                                                               | 설명             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| (parent)    | `/home`, `/trip-live/[tripId]`, `/notifications`, `/my-absences`, `/my-stop-changes`                                                                                                 | 학부모 모바일    |
| (driver)    | `/run`, `/run/notifications`, `/trip/[id]`                                                                                                                                           | 기사 모바일      |
| (helper)    | `/helper-run`, `/trip/[id]`                                                                                                                                                          | 동승자 모바일    |
| (owner)     | `/dashboard`, `/dashboard/notifications`, `/vehicles`, `/students`, `/routes`, `/stops`, `/staff`, `/guardians`, `/absences`, `/stop-change-requests`, `/training`, `/safety-report` | 학원장 PC/태블릿 |
| (marketing) | `/`, `/admin/pre-registrations`                                                                                                                                                      | 마케팅 + admin   |

## 핵심 가드레일 (CLAUDE.md 발췌)

- TypeScript strict, `any` 금지
- Tailwind 임의 색상 (`bg-[#abc]`) 금지 → 토큰만
- 한 파일 300줄 넘으면 분리
- localStorage·sessionStorage 사용 X
- Wake Lock·GPS lifecycle 손대지 말 것
- 100dvh로 iOS Safari address bar 대응
- 학부모 본인 자녀 trip만 (`requireGuardianTripAccess`)
- 모든 도메인 쿼리는 orgId 필터
