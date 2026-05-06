#!/bin/bash
# 셔틀이 git push 직전 신호 hook.
# Hook은 system skill을 직접 invoke 못 하므로 메시지만 출력 + exit 2로
# Claude에 신호 전달. Claude가 메시지 보고 사용자에 /security-review 또는
# shuttle-domain-guard subagent 실행 의향을 제시하도록 한다.
#
# 검사 대상: 보안에 민감한 파일·키워드 변경.

set -u

# 변경 파일 목록 (origin/main 대비). origin이 없으면 staged 변경 대조.
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  CHANGED=$(git diff origin/main..HEAD --name-only 2>/dev/null)
  DIFF=$(git diff origin/main..HEAD 2>/dev/null)
else
  CHANGED=$(git diff --cached --name-only 2>/dev/null)
  DIFF=$(git diff --cached 2>/dev/null)
fi

RISKS=()

# 1. schema·auth·api 같은 보안 민감 영역 변경
if echo "$CHANGED" | grep -qE "(prisma/schema|prisma/migrations|src/lib/auth|src/lib/supabase|src/app/api/.*\.ts)"; then
  RISKS+=("schema·auth·api 변경")
fi

# 2. 환경변수·민감 키워드 노출 (실제 secret이 commit에 들어간 경우)
if echo "$DIFF" | grep -qE "(SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL=postgres|API_KEY=[A-Za-z0-9]+|VAPID_PRIVATE_KEY=)"; then
  RISKS+=("민감 키워드 감지 (환경변수 실값?)")
fi

# 3. RLS migration 점검 — 새 model 추가 시 RLS migration 동봉됐는지
if echo "$CHANGED" | grep -q "prisma/schema.prisma"; then
  if ! echo "$CHANGED" | grep -qE "prisma/migrations/.*\.sql"; then
    RISKS+=("schema 변경됐으나 migration 누락 가능 — RLS 점검 필요")
  fi
fi

if [ ${#RISKS[@]} -gt 0 ]; then
  echo "⚠️  push 직전 보안 점검 권장:" >&2
  for r in "${RISKS[@]}"; do
    echo "   • $r" >&2
  done
  echo "" >&2
  echo "   /security-review 또는 shuttle-domain-guard subagent 실행 후 push 권장." >&2
  echo "   (이 hook은 push를 차단하지 않습니다 — Claude가 점검 의향을 사용자에 묻습니다.)" >&2
  # exit 2 = block + show stderr to Claude. Claude가 메시지 받고 사용자에 의향 묻기 가능.
  exit 2
fi

# 위험 없으면 통과
exit 0
