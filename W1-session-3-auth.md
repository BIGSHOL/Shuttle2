# W1 세션 3 — 인증 + 학원장·원장 가입·로그인

> 세션 2가 끝나고 Prisma 스키마·시드가 완료된 뒤 새 세션을 열고,
> 아래 본문을 그대로 붙여넣으세요.

---

## Claude Code 프롬프트

이전 두 세션에서 부트스트랩과 Prisma 스키마가 끝났습니다. CLAUDE.md를
다시 읽고 시작합니다.

이번 세션의 목표는 학원장·원장(OWNER)이 가입하고 로그인할 수 있는 최소
흐름입니다. 셔틀이는 학원·교습소·어린이집·유치원 모두를 1차 타겟으로
하므로 가입 시 기관 유형(OrgType) 선택이 들어갑니다. 학생·기사·학부모
인증은 다음 마일스톤(W2 이후).

1. Supabase 클라이언트 헬퍼.
   - `@supabase/ssr` 설치.
   - `src/lib/supabase/server.ts`: createClient (cookies 사용,
     Server Component·Route Handler용).
   - `src/lib/supabase/client.ts`: createClient (브라우저용).
   - `src/lib/supabase/middleware.ts`: 세션 갱신 미들웨어.
   - `middleware.ts` (프로젝트 루트): 모든 (owner) 라우트 보호.

2. 가입 흐름 (이메일 + 비밀번호).
   - `/signup`: 다음 4개 입력
     - 기관명 (예: ○○수학학원, ○○어린이집)
     - 기관 유형: ACADEMY | DAYCARE | KINDERGARTEN (라디오 또는 select)
     - 이메일
     - 비밀번호
   - 가입 성공 시 트랜잭션으로 다음을 한 번에:
     a) Supabase Auth 사용자 생성
     b) Organization 생성 (입력한 기관명·유형, plan = TRIAL)
     c) Staff 레코드 생성 (role = OWNER, userId = auth user id)
   - **트랜잭션 안전성**: 트랜잭션 중간 단계가 실패하면 Auth 사용자도
     롤백(또는 cleanup)할 것. 좀비 Auth 사용자 생기면 다음 가입에서
     이메일 중복 충돌 발생하므로 반드시 처리.
   - 이메일 인증은 1차 MVP에서 비활성화 (Supabase 설정).

3. 로그인 흐름 (`/login`).
   - 성공 시 `(owner)/dashboard`로 리다이렉트.

4. 세션·역할 헬퍼 `src/lib/auth/session.ts`.
   - `getCurrentUser()`: Supabase user + Staff(role, orgId) + Organization
     (name, type) 합쳐서 반환.
   - `requireOwner()`: role !== OWNER이면 403.
   - 모든 (owner) Server Component 진입 시 호출.

5. 더미 (owner)/dashboard 페이지.
   - 현재 로그인한 학원장·원장의 기관명, 기관 유형 표시.
   - 차량 수, 학생 수, 등록된 정류장 수 카드 형태로 노출.
   - 시드 데이터로 들어간 기관에 가입해서 들어가면 보일 정도면 됨.
   - Tailwind + card 컴포넌트로 깔끔하게.

6. 로그아웃.
   - 헤더 우상단 dropdown-menu에서 로그아웃.
   - Server Action으로 처리 후 `/login` 리다이렉트.

7. 멀티테넌시 안전장치.
   - dashboard에서 차량·학생·정류장 수 조회 시 반드시 orgId 필터.
   - 헬퍼 함수: `getOrgId()` — 세션에서 추출, 없으면 throw.
   - `(owner)/layout.tsx`에서 `requireOwner()` 호출하고, 그 결과를
     하위 Server Component에 props 또는 React cache로 전달.

8. 커밋:
   - `feat: supabase ssr setup`
   - `feat: signup with org bootstrap (transaction)`
   - `feat: login + session helpers`
   - `feat: minimal owner dashboard`

작업이 끝나면 다음을 보고:

- 새 학원장·원장으로 가입해보고 dashboard 진입까지 가능한지 확인
- 멀티테넌시 안전장치가 어디에서 어떻게 강제되는지 1줄 설명
- OrgType별로 UI 라벨 분기가 필요한 지점 (예: "학생" vs "원아")이
  앞으로 어디에서 발생할지 짧게 메모
- 다음 세션(W2: 차량·노선·정류장 CRUD + 카카오맵 통합)을 위한 준비 사항

---

## W1 종료 체크리스트

세 세션이 끝나면 다음이 모두 되어야 W1 완료:

- [ ] 로컬에서 `pnpm dev` 띄우고 `/signup`에서 새 기관(학원·어린이집·
      유치원 중 하나) 가입 가능
- [ ] 가입 직후 `/dashboard` 진입, 본인 기관명·유형 표시
- [ ] 다른 기관 데이터(시드)가 절대 보이지 않음 (멀티테넌시 1차 검증)
- [ ] Prisma Studio에서 14개 테이블 + 시드 데이터 확인 (LocationPing 포함)
- [ ] GitHub에 push 완료
- [ ] Vercel에 연결해서 프리뷰 배포까지 (10분 소요)

## 작업 중 주의할 함정

- **DATABASE_URL과 DIRECT_URL 헷갈림** — Supabase는 마이그레이션은
  5432(direct), 앱은 6543(pooler). 마이그레이션 실패하면 가장 먼저
  의심해야 할 곳.
- **이메일 인증 활성화 상태** — Supabase 기본값이 활성. 가입 테스트
  중 메일 안 와서 막히면 dashboard에서 비활성화. 1차 MVP는 비활성,
  결제 직전 활성으로 전환.
- **Staff vs Auth User 동기화** — 가입 트랜잭션이 깨지면 Auth는
  생성됐는데 Staff는 안 만들어진 좀비 상태가 생김. Server Action 안에서
  try/catch + Auth 사용자 cleanup 로직 필요.
- **OrgType 라디오 기본값** — 기본값을 ACADEMY로 두고 가입 사용자가
  의식적으로 선택하게 하기. 어린이집·유치원은 후속 의무가 더 많기
  때문에 잘못 등록되면 안전운행기록 PDF 양식이 어긋남.
