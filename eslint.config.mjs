import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 디자이너 핸드오프 자료 — repo에 commit 안 함, lint 안 검사
    "design_handoff_shuttlee/**",
    "data/**",
    // Prisma 생성 클라이언트
    "src/generated/**",
    // W23: 기사용 RN 앱 + shared 패키지 — Next.js ESLint 룰과 다른 규칙군 (RN/Expo 자체 검증)
    "apps/**",
    "packages/**",
  ]),
]);

export default eslintConfig;
