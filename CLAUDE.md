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

- Next.js 15 (App Router) + TypeScript strict
- Prisma + PostgreSQL (Supabase)
- Supabase Auth (이메일·전화 OTP)
- **Supabase Realtime** (기사 → 학부모 실시간 위치 broadcast)
- **카카오맵 JS SDK** (지도·정류장 위치·실시간 셔틀 마커)
- Tailwind CSS + shadcn/ui
- Web Push API + VAPID (학부모 푸시)
- Wake Lock API (기사 운행 화면 잠금 방지)
- 패키지매니저: pnpm
- 배포: Vercel + Supabase Cloud (region: Seoul)
- 모바일은 PWA로 시작, 기사용 네이티브 앱은 W12 이후 검토

## 디렉토리 구조

```
src/
  app/
    (marketing)/        # 랜딩, 가격, 사전등록
    (auth)/             # 로그인·가입·비밀번호 재설정
    (owner)/            # 학원장 대시보드 (PC 우선)
    (driver)/           # 기사 PWA 화면 (Wake Lock 적용)
    (helper)/           # 동승자 PWA 화면 (KIDS만)
    (parent)/           # 학부모 PWA 화면 (실시간 지도 포함)
    api/                # Route Handlers
  lib/
    db.ts               # Prisma client 싱글톤
    supabase/           # 서버·클라이언트 헬퍼 + Realtime 채널
    auth/               # 세션·역할 판정
    map/                # 카카오맵 로더·정류장 헬퍼
    geo/                # GPS 송신·반경 판정
  components/
    ui/                 # shadcn/ui
prisma/
  schema.prisma
  seed.ts
```

## 코딩 규약

- TypeScript strict, `any` 금지. 외부 입력은 zod로 파싱.
- Server Component 우선, Client Component는 `"use client"` 명시 + 최소화.
- 데이터 fetch는 Server Action 또는 Route Handler. 클라이언트에서 직접
  Prisma 호출 금지.
- 모든 DB 쿼리는 `orgId`로 필터. 학원 간 데이터 누출 방지가 최우선.
- 일자/시각은 항상 KST 기준. DB는 UTC, 표시는 `Asia/Seoul`.
- 에러는 swallow 금지. 사용자에게는 한국어 메시지, 로그는 영문.

## 멀티테넌시 규칙 (중요)

- 모든 도메인 테이블은 `orgId` 컬럼 보유.
- Supabase RLS를 활성화하되, 1차 MVP에서는 애플리케이션 레이어에서
  `orgId` 강제 (RLS는 W7 결제 직전에 추가).
- 세션에서 `orgId`를 추출해 쿼리에 항상 주입하는 헬퍼 사용.

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

- "학원·원" = Organization (어린이집·유치원도 포함)
- "차량" = Vehicle (mode: KIDS | GENERAL)
- "노선" = Route (direction: PICKUP 등원 | DROPOFF 하원)
- "정류장" = Stop (lat/lng + radiusM)
- "학생·원아" = Student
- "보호자" = Guardian (학부모 또는 본인)
- "기사" = Driver (Staff role), "동승자" = Helper
- "운행" = Trip (날짜·노선 단위 인스턴스)
- "탑승·하차" = BoardingEvent
- "안전점검" = SafetyCheck (KIDS 모드 운행마다 1건)
- "결석 신청" = AbsenceRequest
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
pnpm dev                # 개발 서버
pnpm db:push            # 스키마 → DB 즉시 반영 (개발용)
pnpm db:migrate         # 마이그레이션 생성·적용
pnpm db:studio          # Prisma Studio
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
```
