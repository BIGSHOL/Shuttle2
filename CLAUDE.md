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
- **Supabase Realtime** (기사 → 학부모 실시간 위치 broadcast)
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
                        # Notification, PushSubscription, ...
  migrations/           # 모든 변경 파일 (RLS는 별도 마이그레이션)
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
- "탑승·하차" = BoardingEvent (BoardingType: BOARD | ALIGHT)
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

### 마일스톤 요약 (2026-05-04 기준)
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

### 알려진 미해결 (다음 세션)
- 학부모 폰 OTP 가입 + 푸시 권한 단계
- Owner trip 상세 Realtime 자동 갱신 (현재 새로고침 필요)
- 약관·개인정보처리방침 정식 법무 검토 (현재 베타 임시본)
- Supabase 이메일 템플릿 한국어 커스터마이즈 (현재 기본 영문)
- 결제 통합 (Toss Payments 또는 Stripe)

### 환경 변수 가드레일 (W15-D 트러블슈팅 결과)
- `lib/env.ts` proxy는 `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` 등 server-only 변수까지 검증
- 따라서 **Client Component에서는 `env.X` 사용 금지** — `process.env.NEXT_PUBLIC_*`을 직접 사용
- `lib/supabase/client.ts`가 모범 예시 (process.env 직접)
- Server Component / Server Action / Route Handler에서만 `env.X` 사용
