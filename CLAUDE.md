# 셔틀이 (shuttlee)

학원·교습소·어린이집·유치원 셔틀버스 운영을 위한 SaaS. 도로교통법상
어린이통학버스 의무를 자동 충족시키고, 학부모가 셔틀 위치를 실시간으로
볼 수 있게 한다.

## 1차 타겟 (둘 다)

- 학원·교습소 (보습·예체능·입시 학원의 셔틀)
- 어린이집·유치원 (영유아 통학 차량)

베타는 셋 다 시도: PARk 자녀 어린이집 1곳 + 학원 1~2곳.

## 두 축의 핵심 가치

1. **분기별 안전운행기록 자동 생성** (별지 제20호의2 서식)
   - 좌석안전띠·동승자·하차 확인을 매 운행 자동 누적 → PDF 일괄 export
   - 미제출 시 과태료 면제 + 사고 시 면책 자료
2. **실시간 GPS 위치 추적**
   - 학부모가 셔틀 현재 위치를 카카오맵에서 실시간으로 봄
   - 스쿨붕붕이 등 기존 솔루션의 안정성·기능성 약점을 정공으로 침공

## 차량 단위 모드

- `KIDS` 모드: 13세 미만 대상 (어린이집·유치원·초등 학원).
  도교법 §52, §53 의무 풀세트 적용. 안전운행기록·동승보호자·하차확인 강제.
- `GENERAL` 모드: 중·고·성인 학원, 기업 통근. 출결과 알림 중심.

## 사용자 역할

- `OWNER` 학원장·원장 — 웹 PC 우선
- `DRIVER` 기사 — 모바일 PWA, 안드로이드 권장 (백그라운드 GPS)
- `HELPER` 동승보호자 — 모바일 PWA, KIDS 모드만
- `GUARDIAN` 학부모 — 모바일 PWA + 푸시 + 카카오맵 실시간 위치
- 성인·중고생 본인 — `GUARDIAN`과 같은 화면, 권한만 다름

## 기술 스택

- Next.js 16 (App Router, Turbopack 기본) + TypeScript strict
  - middleware.ts → **proxy.ts** 마이그레이션됨 (Next.js 16)
- React 19 (`useActionState`)
- Prisma 7 + PostgreSQL (Supabase)
- Supabase Auth (이메일 + 학부모용 토큰 가입)
- **Supabase Realtime** (기사→학부모 5초 GPS broadcast + W16 trip-update 채널 + W16-D org-trips 채널)
- **카카오맵 JS SDK** (지도·정류장 위치·실시간 셔틀 마커)
- Tailwind CSS v4 (`@theme inline` 토큰) + shadcn/ui (radix-nova preset)
- **Pretendard 폰트** (`public/fonts/Pretendard-{Regular,Bold}.ttf` + next/font/local)
- **lucide-react** 아이콘
- Web Push API + VAPID + Service Worker (학부모·직원 푸시)
- Wake Lock API (기사 운행 화면 잠금 방지)
- @react-pdf/renderer (안전운행기록 PDF 생성)
- 패키지매니저: pnpm
- 배포: Vercel + Supabase Cloud (region: Seoul)
- 모바일은 PWA로 시작, 기사용 네이티브 앱은 W14 이후 검토

## 디자인 토큰 (globals.css `@theme inline`)

- `--bus`, `--bus-soft`, `--bus-foreground` — KIDS·LIVE 노란 컬러
- `--success` / `--success-soft` — 등원·승인·완료
- `--warning` / `--warning-soft` — 대기·만료 임박
- `--info` / `--info-soft` — 하원·정보
- `--destructive` / `--destructive-foreground` — 만료·반려·이슈
- `--muted` / `--muted-foreground` — 보조 텍스트·뱃지

**임의 색상 금지** (`bg-[#abc]`, `bg-emerald-100` 등) → 토큰만 사용.

## 라운드(둥근 모서리) 스케일

전체 UI 통일. 과도한 라운드는 모바일 PWA 분위기를 망치므로 **소극적**으로.

- `rounded-lg` (8px) — **외곽 컨테이너** (Card·Section·Banner·KPI 카드·dashboard 카드 등)
- `rounded-md` (6px) — **내부 element** (Button·Input·Badge·Pill·Sub-card·Logo 컨테이너·작은 아이콘 박스 등)
- `rounded-full` — Avatar·원형 아이콘
- `rounded-t-2xl` — 모바일 BottomSheet·Modal 상단 (의도적 idiom, 유지)
- `rounded-3xl` — 마케팅 device frame mock 등 특수 시각 (유지)

**금지**: `rounded-2xl` (외곽), `rounded-xl` (내부) — 너무 round해서 사용 금지.
새 컴포넌트 추가 시 위 스케일을 따를 것.

## 디렉토리 구조

```
src/
  app/
    (marketing)/        # 랜딩 / pricing / 사전등록 / admin
    (auth)/             # /login, /signup (학원장 가입)
    (owner)/            # 학원장 dashboard + CRUD + alerts (PC·태블릿 + 모바일 nav)
    (driver)/           # 기사 PWA (Wake Lock + GPS)
      run/, run/notifications/, trip/[id]/
    (helper)/           # 동승자 PWA (KIDS만, layout 공유)
    (parent)/           # 학부모 PWA + 카카오맵 + 푸시
      home/, trip-live/[tripId]/, notifications/, my-absences/, my-stop-changes/
    api/                # Route Handlers (push subscribe, safety-report PDF)
    invite/[token]/     # 직원 초대 토큰 가입
    parent-invite/[token]/  # 학부모 초대 토큰 가입
  lib/
    db.ts               # Prisma client 싱글톤
    supabase/           # 서버·클라이언트 + Realtime + middleware
    auth/               # 세션·역할 + requireGuardianTripAccess
    map/                # 카카오맵 로더·TripLiveMap (heightClass)
    geo/                # GPS realtime broadcast + 반경 판정
    push/               # web-push 서버 + Notification 모델 미러
    pdf/                # @react-pdf/renderer 안전운행기록
    parent/             # 학부모 dashboard helper (today-trips)
    date/               # KST 헬퍼 (todayBitKst, todayUtcDateKst)
    wake-lock/          # 기사 화면 잠금 방지 hook
  components/
    ui/                 # shadcn/ui (radix-nova)
    child-avatar.tsx, mode-badge.tsx, live-pulse-dot.tsx, trip-status-badge.tsx
prisma/
  schema.prisma         # Org, Vehicle, Route, Stop, Student, Trip, BoardingEvent,
                        # SafetyCheck, AbsenceRequest, StopChangeRequest,
                        # Notification, PushSubscription, StaffFcmSubscription, ...
  migrations/           # 모든 변경 파일 (RLS는 별도 마이그레이션)

apps/
  driver-rn/            # W23: 기사용 RN 사이드로드 APK (안드로이드 전용)
                        # Expo CNG + react-native-background-geolocation +
                        # @react-native-firebase/messaging
packages/
  shared-contracts/     # W23: PWA·RN 양쪽 공유 — zod 스키마, 채널 상수,
                        # loginId 헬퍼, distance, 타입 정의
```

### 라우트 충돌 회피 패턴

route group 다른 그룹이 같은 path를 만들면 빌드 실패. 우리 패턴:

- `/notifications` (parent) ↔ `/run/notifications` (driver) ↔ `/dashboard/notifications` (owner)
- `/absences` (owner) ↔ `/my-absences` (parent)
- `/stop-change-requests` (owner) ↔ `/my-stop-changes` (parent)
- `/trip/[id]` (driver·helper) ↔ `/trip-live/[tripId]` (parent) ↔ `/dashboard/trip/[tripId]` (owner)

## 코딩 규약

- TypeScript strict, `any` 금지. 외부 입력은 zod로 파싱.
- Server Component 우선, Client Component는 `"use client"` 명시 + 최소화.
- 데이터 fetch는 Server Action 또는 Route Handler. 클라이언트에서 직접
  Prisma 호출 금지.
- 모든 DB 쿼리는 `orgId`로 필터. 학원 간 데이터 누출 방지가 최우선.
- 일자/시각은 항상 KST 기준. DB는 UTC, 표시는 `Asia/Seoul`.
- 에러는 swallow 금지. 사용자에게는 한국어 메시지, 로그는 영문.

## 멀티테넌시 규칙 (중요)

- 모든 도메인 테이블은 `orgId` 컬럼 보유 (예외: `Trip`은 vehicle 통해 derive →
  `where: { vehicle: { orgId } }` 패턴).
- Supabase RLS는 W7부터 활성화됨. service_role 키는 Prisma `DIRECT_URL`로 우회.
  새 도메인 모델 추가 시 마이그레이션에서 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 동봉.
- 세션에서 `orgId`를 추출해 쿼리에 항상 주입하는 헬퍼 사용 (`getOrgId()`).

## Realtime 채널 규약 (W16 이후)

같은 `trip:<tripId>` 채널에서 두 종류의 broadcast event:

- `ping` — 기사 폰 GPS 5초 간격, payload: `TripPingPayload (lat/lng/...)`.
  학부모 trip-live + 학원장 trip 상세 라이브 지도가 구독.
- `update` — 기사·동승자 server action(boarding/issue/safety/trip-state) 직후
  `publishTripUpdate(tripId, reason, orgId)`로 publish. payload는 가볍게
  `{ tripId, reason, at }`. 받은 쪽은 `router.refresh()`만 호출 → server
  component가 fresh fetch.

org 단위 채널 `org-trips:<orgId>` — 학원장 dashboard가 N개 trip을 한 번에 보므로
별도 채널. 같은 `update` event를 학원장 trip 상세와 함께 multi-message
broadcast로 동시 발행 (1번의 fetch).

publish는 server에서 Supabase Realtime broadcast HTTP API
(`/realtime/v1/api/broadcast`)로 fire-and-forget. 실패 시 throw 안 함 —
모든 publish 호출 전에 `revalidatePath("/dashboard")` 같은 fallback이 있어
broadcast가 안 가도 다음 진입에서 fresh data가 보인다.

새 server action을 추가하면 publishTripUpdate + revalidatePath를 같이
호출하는 패턴 유지.

## 위치 데이터·보안 규칙

- 서비스 롤 키는 서버 코드에서만. 클라이언트 번들에 절대 포함 금지.
- 학생(미성년) 정보 처리 시 보호자 동의 흐름 필수.
- **위치정보는 운행 시작~종료 사이에만 수집.** 운행 종료 즉시 GPS
  송신 중단 (기사 폰).
- 영구 저장은 30초 간격 + 정류장 통과 시점에 한해 `LocationPing` 테이블에.
- 실시간 broadcast는 Supabase Realtime으로 5초 간격 (영구 저장 안 함).
- 운행 데이터(`LocationPing`, `BoardingEvent`, `SafetyCheck`)는 분기 종료
  후 최소 3년 보관 (안전운행기록 의무 대응).
- 학부모는 본인 자녀의 운행 trip만 조회 가능 (다른 학생 trip 차단).

## iOS 기사 폰 함정 (반드시 인지)

iOS Safari PWA는 백그라운드에서 GPS를 사실상 받지 못한다. 화면 잠그거나
다른 앱 켜면 송신 멈춤. 따라서:

- 기사 운행 화면은 진입 즉시 **Wake Lock API**로 화면 잠금 방지.
- 거치대 + 충전기 사용을 가입 시 안내.
- 베타 시점에는 기사 폰을 안드로이드로 권장. iPhone 기사는 "운행 중
  화면 켠 상태 유지" 명시 안내 + 화면 자동 꺼짐 방지 토스트.
- W12 이후 React Native로 기사용 네이티브 앱 별도 출시 검토.

## 도메인 용어 (코드와 UI 일관성)

- "학원·원" = Organization (어린이집·유치원도 포함, 라벨은 orgType별 분기 — `학생` vs `원아`)
- "차량" = Vehicle (mode: KIDS | GENERAL)
- "노선" = Route (direction: PICKUP 등원 | DROPOFF 하원)
- "정류장" = Stop (lat/lng + radiusM)
- "학생·원아" = Student
- "보호자" = Guardian (학부모 또는 본인)
- "기사" = Driver (Staff role), "동승자" = Helper
- "운행" = Trip (날짜·노선 단위 인스턴스, status는 startedAt/endedAt에서 derive)
- "탑승·하차" = BoardingEvent (BoardingType: BOARD | ALIGHT | NO_SHOW | NO_DROPOFF)
- "안전점검" = SafetyCheck (KIDS 모드 운행마다 1건)
- "결석 신청" = AbsenceRequest (AbsenceStatus: PENDING | NOTIFIED_DRIVER | ACKNOWLEDGED | REJECTED)
- "정류장 변경 요청" = StopChangeRequest (RequestStatus: PENDING | APPROVED | REJECTED)
- "알림" = Notification (NotificationCategory enum, web-push + DB 미러)
- "위치 ping" = LocationPing (운행 중 위치 기록)

## 절대 하지 말 것

- localStorage·sessionStorage 사용 금지 (서버 세션 사용).
- 클라이언트에서 Prisma 직접 호출 금지.
- Tailwind 임의 색상 (`bg-[#abc]`) 금지. 디자인 토큰 사용.
- 한 파일이 300줄 넘으면 분리.
- 테스트 없이 도메인 로직 머지 금지 (W3부터 vitest 도입).
- 운행 종료 후 GPS 송신 계속하지 말 것 (개인정보 침해).
- 기사 폰 운행 화면을 단순 페이지로 만들지 말 것 (Wake Lock 필수).

## 자주 쓰는 명령어

```
pnpm dev                # 개발 서버 (Next.js 16 Turbopack)
pnpm db:push            # 스키마 → DB 즉시 반영 (개발용)
pnpm db:migrate         # 마이그레이션 생성·적용 (RLS는 별도 .sql 마이그레이션)
pnpm db:studio          # Prisma Studio
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
pnpm build              # production 빌드 (라우트 충돌 검증)
vercel deploy --prod --yes  # 프로덕션 배포
```

## 진행 현황

`progress.md` — 세션이 끊겨도 웹/앱 클로드 코드에서 이어가도록 마일스톤·결정사항·다음 우선순위 기록.

### 마일스톤 요약 (2026-05-06 기준)

- W1~W7: 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육
- W8: 마케팅 사전등록 + admin
- W9: 학부모 home + trip-live 디자인 (Pretendard 적용)
- W10: Notification + StopChangeRequest + 결석 반려 워크플로우
- W11: 기사 화면 디자인 (mobile-first + dark gradient running header)
- W12: 학원장 dashboard 재구성 + 실시간 운행 모니터 + 토큰 마이그레이션
- W13: 마케팅 랜딩 + /pricing + login/signup 디자인
- W14: 학부모 invite + notification-toggle 디자인
- W15-A: Owner-side trip 상세 view (`requireOwnerTripAccess` + `/dashboard/trip/[tripId]`)
- W15-B: BoardingType NO_SHOW/NO_DROPOFF + 미탑승·미하차 보고 UI + 학부모·학원장 푸시
- W15-C: /terms · /privacy 페이지 + 가입 동의 체크박스 link
- W15-D: /forgot-password + /reset-password 비밀번호 재설정 흐름
- W16: 학원장 trip 상세 실시간 자동 갱신 (Realtime broadcast HTTP API + router.refresh)
- W16-B: 학원장 trip 상세 실시간 GPS 지도 (`useTripBroadcast` 재사용)
- W16-C: 종료 운행 GPS 경로 (LocationPing trail polyline)
- W16-D: 학원장 dashboard 실시간 자동 갱신 (`org-trips:<orgId>` 채널)
- W17-A: Supabase 비밀번호 재설정 메일 한국어 템플릿
- W17-C: 학부모 BottomTabBar (홈·알림·결석·정류장 4탭)
- W17-D: 기사·동승자 trip 화면 실시간 자동 갱신 (`TripRealtimeRefresher` 공용화)
- W17-E: `SHUTTLE_NEAR_CHILD` 알림 카테고리 + 안전운행기록 PDF에 GPS 누적거리
- W18: 베타 직전 패키지 — 안전교육 이수증 Storage 업로드, NO_SHOW S1·S2·M1·M2,
  Prisma pooler 전환·DB 인덱스·Promise.all 병렬화, loginId+recoveryEmail 도입,
  데이터 고도화 #1·#2·#10 (NO_SHOW 빈도·SaaS KPI·ETA 학습)
- W18-B: 사용자 노출 영어 광범위 한글화 (LIVE/ETA/GPS/PWA/Lite·Standard·Pro
  /Web Push/User Agent/endpoint/broadcast → 운행 중·도착 예상·위치·앱·라이트·
  스탠다드·프로·푸시 알림·브라우저 종류·구독 주소·실시간 위치 전송)
- W18-C: layout 진입 가드를 throw → redirect (driver/helper/owner 모두
  비-역할 사용자가 영어 stack trace 보지 않게 본인 home으로 redirect)
- W19: 학원장 차량 모니터링 강화 — 운행 중 trail polyline (Hybrid 30s
  server fetch + 5s broadcast append), dashboard 멀티 trip 라이브 지도
  (`MultiTripLiveSection` + `useTripBroadcastWithTrail`), Trip 상세 운행
  통계 카드 + 정류장 도착 시각 표, `/dashboard/analytics` 노선·기사별 평균
  통계 페이지 + nav 항목. trip-stats utility(`src/lib/geo/trip-stats.ts`)로
  안전운행기록 PDF의 누적거리 계산 코드도 DRY refactor.
- W20: UX 풀세트 — 학생 360° 상세(`/students/[id]`) + Trip 상세 cross-link
  (기사명→분석, 학생명→상세) + Dashboard 미탑승 학생 클릭 + 알림 routing
  bug fix (학부모 stop-change url) + Toast(Sonner) 시스템 + error.tsx /
  not-found.tsx + 기사 권한 사전 체크 카드 + 학부모 trip-live 기사 통화
  CTA + GPS 끊김 복구 안내·재시도 + 학부모 홈 "내 신청 현황" 카드 (대기
  카운트 배지) + PWA 설치 안내 배너 (Android beforeinstallprompt + iOS
  Safari "공유→홈 화면에 추가" 안내).
- W21: 학원장 메뉴 4종 360° drill-down — 차량(`/vehicles/[id]`) 30일 운행 통계·
  배정 노선·안전점검 미흡, 직원(`/staff/[id]`) 운행 통계·안전교육 만기·분석 페이지
  cross-link, 정류장(`/stops/[id]`) 카카오맵 read-only(`stop-map-display`)·사용
  노선·home 학생·변경 요청 빈도, 학부모(`/guardians/[id]`) 자녀·결석/변경
  history·푸시 디바이스 진단. list page 행 클릭 → detail 통일.
- W22: Suspense 스트리밍 — 학부모 `/home`·`/trip-live`, 학원장 `/dashboard`에서
  빠른 KPI 즉시 paint + 무거운 nested fetch만 부분 stream. 가장 느린 한 쿼리에
  첫 paint가 묶이던 패턴 해소.
- **W23: 기사용 React Native 사이드로드 APK 분리** — iOS Safari PWA의 백그라운드
  GPS 한계 우회. 기사만 RN, 학부모·학원장·HELPER·iOS 기사는 PWA 그대로.
  - 모노레포 전환: `apps/driver-rn/`, `packages/shared-contracts/` (pnpm workspace).
    `loginIdToEmail`, 채널 상수(`tripChannelName`/`TRIP_PING_EVENT`), zod 스키마
    (`PingInputSchema` 등), `haversineMeters`, `TripDetailPayload` 타입을 공유.
  - 서버: 기사 mutation 13개를 `src/server/driver/*`로 비즈니스 함수 추출, 기존 SA
    + 새 Route Handler(`/api/driver/*` 12개)가 같은 함수 호출. middleware에 Bearer
    토큰 분기 추가 (RN access_token → `supabase.auth.getUser(token)` 검증 → 기존
    `x-auth-*` header inject 흐름 재사용). `/api/*`는 PUBLIC_PATHS에 추가 — 미인증
    시 401 JSON.
  - RN: Expo CNG (Expo SDK 53), `react-native-background-geolocation` Foreground
    Service로 화면 꺼져도 5초 broadcast 유지 + 30초 INTERVAL ping + STOP_PASS
    haversine 자동 판정. `expo-keep-awake`로 화면도 켬. 단순 useState navigation,
    LoginScreen + RunListScreen + TripScreen + NotificationsScreen.
  - 푸시: 새 `StaffFcmSubscription` 테이블, `firebase-admin/messaging`로 fan-out.
    `sendToStaff`/`sendToOwnersOfOrg`가 web-push + FCM 양쪽 병렬 발송.
    `@react-native-firebase/messaging`로 RN 토큰 등록·foreground listener.
  - OTA: `/api/driver-app/version` GET endpoint + RN `version-check.ts`로 시작 시
    fetch → 신 APK 있으면 강제 prompt → APK URL `Linking.openURL`. EAS Update
    채널 3개(production/preview/development).
  - 가이드: `/help/driver-app` 한글 사이드로드 가이드 페이지 (PUBLIC) +
    `<DriverAppShareCard>` 학원장 dashboard 카드(다운로드+가이드 링크 클립보드 복사).
  - 베타 운영 약속: 안드로이드 기사만 RN 앱, iOS 기사는 PWA 화면 켠 채. 베타
    APK는 Supabase Storage `driver-apks` public bucket에서 서빙.

### 알려진 미해결 (다음 세션)

- 학부모 폰 OTP 가입 + 푸시 권한 단계
- 약관·개인정보처리방침 정식 법무 검토 (현재 베타 임시본)
- 가입 확인 메일 한국어 (W17-B, email_confirm bypass 해제 시)
- 결제 통합 (Toss Payments 또는 Stripe)
- 기사용 RN 앱 지도 (W23는 정류장 리스트만 — react-native-maps 본격 통합은 베타 후)
- 사용자 작업 (베타 시작 전 — W23-A 2026-05-07 진척):
  - ✅ `pnpm db:migrate` (StaffFcmSubscription) — 처리 완료
  - ✅ Firebase 프로젝트 + `apps/driver-rn/google-services.json` (private repo
       commit `560876f`이므로 다른 컴퓨터로 별도 secret 이동 불필요)
  - ✅ Vercel env: `FIREBASE_PROJECT_ID`/`CLIENT_EMAIL`/`PRIVATE_KEY` 등록 완료
  - ✅ Vercel env: `DRIVER_APP_LATEST_VERSION = 1.0.0` (W23-A에서 등록)
  - ✅ Supabase Storage `driver-apks` PUBLIC bucket (50MB)
  - ⏳ EAS preview 빌드: 큐 진입 (Build `d79ca416-933d-4929-a2ae-af1593602a95`)
       → 빌드 완료 후 APK 다운로드 → Storage 업로드 → Vercel env
       `DRIVER_APP_LATEST_APK_URL` 등록
  - ⚠️ EXPO_TOKEN 2개 회전 필수 — 채팅 transcript에 평문 노출. 베타 시작 전
       expo.dev → Account → Access Tokens에서 revoke + 재발급 → 1Password 보관

### 환경 변수 가드레일 (W15-D·W18 트러블슈팅 결과)

- `lib/env.ts`는 **`import "server-only"`로 보호**됨 — client에서 import 시도 시
  Next.js가 빌드 시점 차단 (React Server Components 가드).
- `lib/env.ts` proxy는 `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` 등 server-only
  변수까지 검증하므로 client에서 호출되면 zod parse 실패 → 화면에
  "Invalid environment variables: {}" 에러.
- 따라서 **Client Component에서는 `env.X` 사용 금지** — `process.env.NEXT_PUBLIC_*`을
  직접 사용 (Next.js가 빌드 타임에 client 번들로 inline).
- 모범 예시:
  - `lib/supabase/client.ts` (process.env 직접)
  - `lib/map/stop-map-picker-inner.tsx` (W18 fix)
  - `lib/map/trip-live-map-inner.tsx` (W18 fix)
- Server Component / Server Action / Route Handler에서만 `env.X` 사용

### 인증 식별자 (W18 loginId 도입)

- Supabase Auth는 이메일 기반이지만 우리 layer에서 loginId(영문·숫자·_ 4~20자)
  매핑. `${loginId}@shuttlee.local`이라는 placeholder 이메일이 Auth user.email에
  저장됨 (`.local`은 RFC 6762 mDNS 예약 — 외부 SMTP 라우팅 불가).
- 가입 시 `recoveryEmail` 입력하면 그 이메일이 Auth user.email로 저장돼
  `/forgot-password`에서 본인이 reset 메일을 받음. 미입력자는 학원장 admin
  reset만 가능.
- 로그인 폼은 단일 input ("이메일 또는 로그인 아이디") — `@` 포함이면 이메일,
  아니면 DB에서 loginId → recoveryEmail 또는 placeholder 이메일 lookup.

### Layout 진입 가드 패턴 (W18-C)

각 role 그룹의 layout이 **throw 대신 redirect**로 잘못된 역할 진입 처리:

```ts
const user = await getCurrentUser();
if (!user) {
  const guardian = await getCurrentGuardian();
  if (guardian) redirect("/home");
  redirect("/login?redirectTo=<role-home>");
}
if (user.staff.role !== "<EXPECTED>") {
  redirect(homePathForRole(user.staff.role));
}
```

새 role 그룹 추가 시 이 패턴 따라야 영어 stack trace가 사용자에게 노출 안 됨.
- Server Component / Server Action / Route Handler에서만 `env.X` 사용

### Owner 360° detail page 패턴 (W20-A·W21)

학원장 list 페이지에서 행 클릭 → detail 진입은 학생(`/students/[id]`) 360°가
원형. W21에서 차량·기사·정류장·학부모 4개로 확장. 새로 detail 페이지 추가할
때 다음 템플릿 따름:

**1. 신규 server component `(owner)/<resource>/[id]/page.tsx`**

```ts
export default async function ProfilePage({ params }) {
  const { id } = await params;
  await requireOwner();
  const orgId = await getOrgId();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  // 1차 검증 + 관련 쿼리 N개를 Promise.all로 병렬 (orgId 필터 필수)
  const [resource, ...related] = await Promise.all([
    db.<resource>.findFirst({ where: { id, orgId } }),
    // ... 30일 history·관련 list·통계 입력
  ]);
  if (!resource) notFound();
  // ...
}
```

- `Date.now()` 직접 호출 금지 (React 19 `react-hooks/purity`). 진입 시점의
  `today.getTime()` 같은 캡처 값 사용.
- Guardian처럼 orgId 컬럼이 없는 모델은 `where: { id, links: { some: { student: { orgId } } } }`
  같이 자녀(또는 다른 owned model) join 필터로 1차 검증.

**2. 섹션 구성 (위→아래)**

- 뒤로가기 (`<ArrowLeft>` + 9x9 rounded-full)
- 헤더: 메인 라벨 + 배지(상태·종류) + 보조 정보 + 액션 버튼(편집·삭제·"분석" cross-link)
- 30일 통계 4-grid: `bg-card rounded-lg border` 외곽 + `grid-cols-2 lg:grid-cols-4 gap-px bg-border` 내부
- 관련 list 카드들: `<Card><CardHeader><CardContent className="p-0"><ul className="divide-y">`

재사용 컴포넌트:
- `<AnalyticsStatsCard>` — `dashboard/analytics/_components/trip-detail-list.tsx` (W19)
- `<TripDetailList variant="route|driver">` — 같은 파일
- `computeTripStats()` — `src/lib/geo/trip-stats.ts` (W19)
- `<StopMapDisplay>` — `src/lib/map/stop-map-display.tsx` (W21, read-only kakao map)
  picker(검색·내 위치·onPick) 없는 단순 표시 모드. dynamic import wrapper로 SSR-safe.

**3. List page 행 클릭 진입 패턴**

- 모바일 카드: 외곽 div를 `<Link className="bg-card hover:bg-muted/40 ... block">` wrap
- 데스크톱 표: `<TableRow className="hover:bg-muted/50">` + 각 `<TableCell className="p-0"><Link className="block px-2 py-2">` (anchor nesting 회피)
- 액션 버튼들(편집·삭제·비번 초기화)은 detail 페이지로 이동 — list 행 Link 안에 button 있으면 React hydration 경고

**4. Cascading lint 처리 (sub-route 신규 생성 시)**

`/students/[id]` 같은 신규 sub-route를 만들면, 같은 prefix의 `<a href="/students">` 태그가
`@next/next/no-html-link-for-pages` 룰에 걸린다. `<Link>`로 일괄 교체 필요. 빌드
직전 `pnpm lint` 한 번 돌려 cascade된 에러 잡을 것.
