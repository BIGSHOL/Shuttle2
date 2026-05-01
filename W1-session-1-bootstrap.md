# W1 세션 1 — 프로젝트 부트스트랩

> Claude Code 새 세션을 열고, 아래 본문을 그대로 붙여넣으세요.
> CLAUDE.md를 프로젝트 루트에 미리 저장해두어야 합니다.

---

## 사전 준비 (사람이 직접)

1. GitHub에 빈 리포지토리 생성: `shuttlee` (private)
2. Supabase 새 프로젝트 (region: Seoul)
3. **카카오 디벨로퍼 사이트** (https://developers.kakao.com)에서 앱 생성
   → 플랫폼 등록 (Web, 도메인은 일단 `localhost:3000`) → JavaScript 키 복사
4. Supabase에서 받아둘 값:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
   - `DATABASE_URL` (pooler 6543)
   - `DIRECT_URL` (direct 5432, 마이그레이션용)
5. 로컬 폴더 만들고 `git init` + GitHub 리모트 연결
6. CLAUDE.md를 폴더 루트에 저장
7. Claude Code를 폴더 루트에서 실행

---

## Claude Code 프롬프트 (그대로 붙여넣기)

당신은 신규 프로젝트 "shuttlee"의 부트스트랩을 담당합니다.
프로젝트 컨텍스트는 CLAUDE.md를 먼저 읽고 따릅니다.

이번 세션의 목표는 다음 5개입니다.

1. Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 프로젝트
   생성. 패키지매니저는 pnpm. ESLint·Prettier 포함.

2. shadcn/ui 초기화 (style: new-york, base-color: zinc). 일단 button,
   input, label, card, dialog, dropdown-menu, sonner, form, table 컴포넌트
   추가.

3. 디렉토리 구조를 CLAUDE.md 명세대로 생성. 빈 라우트 그룹과 placeholder
   page.tsx만 두면 됨. `src/lib/map/`과 `src/lib/geo/` 폴더도 함께 생성
   (다음 마일스톤에서 채움).

4. 환경변수 스캐폴딩.
   - `.env.example`에 다음 키들을 채움 (값은 빈칸 유지):
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     DATABASE_URL
     DIRECT_URL
     NEXT_PUBLIC_KAKAO_MAP_KEY
     NEXT_PUBLIC_VAPID_PUBLIC_KEY
     VAPID_PRIVATE_KEY
     ```
   - `.env.local`은 `.gitignore`에 포함 확인.
   - `src/lib/env.ts` 만들고 zod로 파싱. 잘못된 환경변수면 부팅 실패.
     단, VAPID 키들은 W6에서 사용하므로 `.optional()`로 표시.

5. 깃 커밋 단위 정리.
   - `feat: bootstrap next.js 15 + tailwind`
   - `feat: install shadcn/ui base components`
   - `feat: scaffold directory structure`
   - `chore: env scaffolding with zod`

각 커밋은 컨벤셔널 커밋. 작업이 끝나면 다음을 보고:

- 설치한 주요 패키지 버전
- 생성한 디렉토리 트리 (3 depth)
- `.env.example` 내용
- 다음 세션에서 해야 할 일

수정·결정이 필요한 지점이 있으면 추측하지 말고 물어보세요.

---

## 세션 종료 후 사람이 할 것

1. Supabase 대시보드 → Settings → API에서 URL과 키 복사
2. Settings → Database → Connection string에서 `DATABASE_URL` (Pooler, 6543)과
   `DIRECT_URL` (Direct, 5432) 복사
3. 카카오 디벨로퍼에서 받은 JavaScript 키를 `NEXT_PUBLIC_KAKAO_MAP_KEY`에
4. `.env.local`에 7개 값 중 5개 채우기 (VAPID 둘은 W6에서)
5. `pnpm dev` 한 번 띄워서 환경변수 파싱 통과하는지 확인
6. 통과하면 세션 2로 진행
