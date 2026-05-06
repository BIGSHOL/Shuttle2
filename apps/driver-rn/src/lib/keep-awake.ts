// 화면 잠금 방지 hook.
// expo-keep-awake가 마운트 동안 자동 deactivate. 운행 화면이 보이는 동안만 활성.
//
// 안드로이드는 react-native-background-geolocation의 Foreground Service가 앱
// 프로세스를 살리고, 이 hook은 화면도 켜둠 — 두 메커니즘이 보완.

import { useKeepAwake as useExpoKeepAwake } from "expo-keep-awake";

const TRIP_KEEP_AWAKE_TAG = "shuttlee-trip";

export function useTripKeepAwake(): void {
  useExpoKeepAwake(TRIP_KEEP_AWAKE_TAG);
}
