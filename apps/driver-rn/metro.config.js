// Expo metro config (W23-E 1.0.3 핫픽스 — React duplication 해결).
//
// 문제: monorepo + pnpm workspace 환경에서 두 가지 React 버전이 병존.
//   - apps/driver-rn/node_modules/react = 19.0.0 (RN 0.79.6 peer)
//   - D:/shuttle2/node_modules/react   = 19.2.4 (Next.js 16용)
// metro가 둘 다 번들에 포함시켜 hooks 컨텍스트가 끊겨 첫 render 시점에
// `TypeError: Cannot read property 'useState' of null` 강제 종료 → 흰 화면.
//
// 해결: extraNodeModules로 react/react-native/react/jsx-runtime 등을
// driver-rn local 경로로 강제 alias. 이게 hierarchical lookup보다 우선.
//
// Metro CLI는 CommonJS만 지원하므로 require() 사용. PWA ESLint의
// no-require-imports 규칙은 이 파일에서만 disable.

/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// monorepo 패키지(packages/*) 변경 감지를 위해 root까지 watch.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// react·react-native·jsx-runtime을 driver-rn local로 단일화.
// 다른 dependency는 hierarchical lookup으로 처리 (workspace 패키지 포함).
const projectModules = path.resolve(projectRoot, "node_modules");
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    react: path.resolve(projectModules, "react"),
    "react-native": path.resolve(projectModules, "react-native"),
    "react/jsx-runtime": path.resolve(projectModules, "react/jsx-runtime"),
    "react/jsx-dev-runtime": path.resolve(
      projectModules,
      "react/jsx-dev-runtime",
    ),
  },
  // 두 nodeModulesPaths를 명시해 hoisted vs isolated 양쪽에서 동일한 우선순위.
  nodeModulesPaths: [projectModules, path.resolve(monorepoRoot, "node_modules")],
};

module.exports = config;
