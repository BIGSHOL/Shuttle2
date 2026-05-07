// Expo metro config (W23-F 1.0.4 핫픽스 — React duplication 결정적 해결).
//
// 배경:
//   - apps/driver-rn/node_modules/react = 19.0.0 (RN 0.79.6 peer 정확 매칭)
//   - monorepo root/node_modules/react  = 19.2.4 (Next.js 16용)
//   둘 다 별도 인스턴스. RN reconciler가 root의 19.2.4 useState를 호출하면
//   dispatcher가 null → `TypeError: Cannot read property 'useState' of null`
//   → 흰 화면 + JS bridge 죽음.
//
// 1.0.3 시도(extraNodeModules + nodeModulesPaths에 monorepoRoot 포함)는 실패:
//   - extraNodeModules는 fallback resolver. hierarchical lookup이 우선되면 무시됨.
//   - nodeModulesPaths에 monorepoRoot 포함되어 metro가 root의 react@19.2.4를
//     hierarchical lookup으로 가져와 번들에 포함.
//
// 1.0.4 fix:
//   1) resolver.resolveRequest hook — metro의 first-class API. 모든 import 전에
//      호출되고 hierarchical lookup보다 우선. react·react-native·jsx-runtime을
//      driver-rn local entry로 강제 redirect.
//   2) nodeModulesPaths에서 monorepoRoot 제거 — root의 react를 lookup 자체 차단.
//      watchFolders는 유지(packages/* 변경 감지).
//   3) extraNodeModules는 backup으로 유지(resolveRequest 못 잡는 edge case 대비).

/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const projectModules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// monorepo packages/* 변경 감지 — watch는 유지, resolution은 driver-rn local만.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// react·react-native·jsx-runtime을 driver-rn local로 강제 alias.
// require.resolve가 driver-rn paths만 사용해 정확한 entry path 계산
// → metro에 sourceFile로 직접 전달.
const reactRedirects = {
  react: require.resolve("react", { paths: [projectModules] }),
  "react-native": require.resolve("react-native", { paths: [projectModules] }),
  "react/jsx-runtime": require.resolve("react/jsx-runtime", {
    paths: [projectModules],
  }),
  "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime", {
    paths: [projectModules],
  }),
};

config.resolver = {
  ...config.resolver,
  // backup: resolveRequest가 못 잡는 edge case 대비.
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
  // monorepoRoot 제거 — root의 react@19.2.4를 hierarchical lookup으로
  // 가져오는 경로 차단. driver-rn local만 lookup.
  nodeModulesPaths: [projectModules],
  // first-class hook: 모든 import 전에 호출. hierarchical lookup보다 우선.
  resolveRequest: (context, moduleName, platform) => {
    const redirected = reactRedirects[moduleName];
    if (redirected) {
      return { type: "sourceFile", filePath: redirected };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
