// Expo metro config — node-linker=hoisted 환경이라 npm/yarn 같은 flat
// 구조라 monorepo override 거의 불필요. monorepo root만 watchFolders에
// 추가해 packages/* 변경 감지 유지. nodeModulesPaths/disableHierarchicalLookup
// override는 isolated 환경 전제였어 doctor 경고 → 제거하고 Expo default 사용.
//
// Metro CLI는 CommonJS만 지원하므로 require() 사용. PWA ESLint의
// no-require-imports 규칙은 이 파일에서만 disable.

/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

module.exports = config;
