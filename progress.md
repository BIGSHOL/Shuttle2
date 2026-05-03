# 셔틀이 진행 현황

> **이 문서는 세션 중간에도 업데이트되어 웹/앱 클로드 코드로 이어갈 수 있게 함**
> 마지막 업데이트: 2026-05-03 (W16 학원장 trip 상세 실시간 자동 갱신)

## 완료된 마일스톤

| 단계 | 내용 | 커밋 | 배포 |
|---|---|---|---|
| W1~W7 | 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육 | `e224bf6` | ✅ |
| W8 | 마케팅 랜딩 + 사전등록 + admin | `b830a72` | ✅ |
| W9 | 학부모 home + trip-live 디자인 | `16c9805` | ✅ |
| W10 | Notification 모델 + StopChangeRequest + 결석 반려 + 학부모/owner 워크플로우 | `abb8a5b`, `00f07eb` | ✅ |
| W11 | 기사 화면 디자인 (mobile-first + dark gradient running header + tokens) | `b4cb872` | ✅ |
| W12 | 학원장 dashboard 재구성 + 실시간 운행 모니터 + owner 토큰 마이그레이션 | `f87e566` | ✅ |
| W13 | 마케팅 랜딩 디자인 + /pricing 신규 + login/signup 디자인 | `dc75d7a`, `a1b41a4` | ✅ |
| W14 | 학부모 invite 디자인 + notification-toggle 토큰화·시각 강화 | `7776d9b` | ✅ |
| W15-A | Owner-side trip 상세 view + parent-invite 줄바꿈 수정 | `e71961f` | ✅ |
| W15-B | BoardingType NO_SHOW/NO_DROPOFF + 미탑승·미하차 보고 UI + 푸시 | `a2bf51b` | ✅ |
| W15-C | 약관·개인정보처리방침 + 가입 동의 link | `3c41c2a` | ✅ |
| W15-D | 비밀번호 재설정 흐름 (`/forgot-password` → `/reset-password`) + client env 수정 | `684315a` | ✅ |
| W16 | 학원장 trip 상세 실시간 자동 갱신 (Realtime broadcast + router.refresh) | _이번_ | ⏳ |
| W16-B | 학원장 trip 상세 실시간 GPS 지도 (`useTripBroadcast` 재사용) | _이번_ | ⏳ |
| W17-A | Supabase 비밀번호 재설정 메일 한국어 템플릿 (`supabase/templates/recovery.html`) | _이번_ | ⏳ |
| W17-C | 학부모 BottomTabBar (홈·알림·결석·정류장 4탭) | _이번_ | ⏳ |

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

## 다음 우선순위 (W17-B+)

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
