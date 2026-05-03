# 셔틀이 (Shuttlee)

학원·교습소·어린이집·유치원 셔틀버스 운영 SaaS.

도로교통법 §53⑦ 어린이통학버스 안전운행기록 의무를 자동 충족하고,
학부모가 셔틀 위치를 카카오맵에서 실시간으로 봅니다.

> **베타 운영 중**: https://shuttle2-nine.vercel.app/

## 핵심 가치 (두 축)

1. **분기 안전운행기록 PDF 자동 생성** — 별지 제20호의2 양식
   - 좌석안전띠·동승보호자·전원하차 체크가 매 운행 자동 누적
   - 분기마다 PDF 일괄 export → 관할 경찰서 제출
2. **실시간 셔틀 GPS** — 학부모 카카오맵
   - 기사 폰 GPS 5초마다 학부모 앱에 broadcast
   - 자녀 정류장 도달 시 자동 푸시

## 차량 모드

- **KIDS** — 13세 미만 (어린이집·유치원·초등 학원). 도교법 §52, §53 풀세트.
- **GENERAL** — 중·고·성인 학원, 기업 통근. 출결·알림 중심.

## 기술 스택

- **Next.js 16** App Router (Turbopack 기본, `proxy.ts`)
- **React 19** (`useActionState`)
- **TypeScript** strict
- **Prisma 7** + **PostgreSQL** (Supabase, region: Seoul)
- **Supabase Auth** (이메일·토큰 가입) + **Realtime** (GPS broadcast)
- **카카오맵 JS SDK** (지도·정류장·셔틀 마커)
- **Tailwind CSS v4** (`@theme inline`) + **shadcn/ui** (radix-nova) + **Pretendard**
- **lucide-react** 아이콘
- **Web Push** + VAPID + Service Worker
- **Wake Lock** (기사 운행 중 화면 잠금 방지)
- **@react-pdf/renderer** (안전운행기록 PDF)
- **pnpm** + **Vercel** 배포

## 사용자 역할

- `OWNER` 학원장·원장 — 웹 PC + 태블릿 (모바일 nav 가로 스크롤)
- `DRIVER` 기사 — 모바일 PWA (안드로이드 권장, GPS·Wake Lock)
- `HELPER` 동승보호자 — 모바일 PWA (KIDS 모드만)
- `GUARDIAN` 학부모 — 모바일 PWA + 푸시 + 실시간 지도
- 성인·중고생 본인 — `GUARDIAN` 화면 재사용

## 디렉토리 구조

```
src/app/
  (marketing)/        # 랜딩, /pricing, /admin, 사전등록
  (auth)/             # /login, /signup
  (owner)/            # 학원장 dashboard + CRUD + alerts
  (driver)/           # /run, /run/notifications, /trip/[id]
  (helper)/           # /helper-run, /trip/[id] (driver layout 공유)
  (parent)/           # /home, /trip-live, /notifications, /my-absences, /my-stop-changes
  invite/[token]/         # 직원 초대 가입
  parent-invite/[token]/  # 학부모 초대 가입
  api/                # Route Handlers
src/lib/
  db.ts, supabase/, auth/, map/, geo/, push/, pdf/, parent/, date/, wake-lock/
src/components/
  ui/ (shadcn), child-avatar, mode-badge, live-pulse-dot, trip-status-badge
prisma/
  schema.prisma, migrations/
```

## 시작하기

### 환경 변수

`.env.local` 필요:

```
DATABASE_URL=postgresql://...   # Supabase pooler (RLS 적용)
DIRECT_URL=postgresql://...     # Prisma 직접 연결 (서비스 롤, RLS 우회)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_KAKAO_MAP_APPKEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:hello@shuttlee.kr
```

### 명령어

```bash
pnpm install
pnpm dev              # 개발 서버
pnpm db:push          # 스키마 → DB (개발)
pnpm db:migrate       # 마이그레이션 생성·적용
pnpm db:studio        # Prisma Studio
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm build            # production 빌드 (라우트 충돌 검증)
```

### 배포

```bash
vercel deploy --prod --yes
```

## 마일스톤 (2026-05-04 기준)

| 단계 | 내용 |
|---|---|
| W1~W7 | 도메인 모델·CRUD·기사·학부모·실시간 GPS·KIDS 안전점검·RLS·보험 D-30·안전교육 |
| W8 | 마케팅 사전등록 + admin |
| W9 | 학부모 home + trip-live 디자인 (Pretendard) |
| W10 | Notification + StopChangeRequest + 결석 반려 워크플로우 |
| W11 | 기사 화면 디자인 (dark gradient running header) |
| W12 | 학원장 dashboard 재구성 + 실시간 운행 모니터 + 토큰 마이그레이션 |
| W13 | 마케팅 랜딩 + /pricing + login/signup 디자인 |

자세한 진행 현황·결정사항·다음 우선순위는 [`progress.md`](./progress.md) 참고.

## 가드레일

CLAUDE.md "절대 하지 말 것" 발췌:

- localStorage·sessionStorage 사용 금지
- 클라이언트에서 Prisma 직접 호출 금지
- 임의 색상 (`bg-[#abc]`, `bg-emerald-100` 등) 금지 — 디자인 토큰만
- 한 파일 300줄 넘으면 분리
- 운행 종료 후 GPS 송신 계속하지 말 것 (개인정보)
- 기사 폰 운행 화면을 단순 페이지로 만들지 말 것 (Wake Lock 필수)
- 모든 도메인 쿼리는 `orgId` 필터 (학원 간 데이터 누출 방지)

## 라이선스

Proprietary. © 2026 셔틀이.
