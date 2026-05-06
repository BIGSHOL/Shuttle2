// Expo + pnpm monorepo 호환 metro config.
// 기본 expo metro config에 monorepo root 추가:
//   1) watchFolders   — packages/*, root node_modules의 파일 변경 감지
//   2) nodeModulesPaths — symlink 우회로 hoisted dep 찾기
//   3) disableHierarchicalLookup — pnpm strict store에서 잘못된 fallback 차단
//
// 참고: https://docs.expo.dev/guides/monorepos/
//
// Metro CLI는 CommonJS만 지원하므로 require() 사용. PWA ESLint의
// no-require-imports 규칙은 이 파일에서만 disable.

/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
