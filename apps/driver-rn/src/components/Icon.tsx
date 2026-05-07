// 아이콘 wrapper — @expo/vector-icons + React 19 type 호환성 우회.
//
// @expo/vector-icons가 아직 React 19의 새 ReactNode (Promise<ReactNode> 포함)
// 타입과 안 맞아서 JSX 직접 사용 시 TS error. 여기서 ComponentType<IconProps>로
// cast하고 사용처는 이 wrapper만 import.
//
// name type은 string으로 일반화 (각 icon set의 정확한 union을 유지하려면
// 추가 작업이 많음 — 베타에서는 충분).

import {
  Feather as FeatherRaw,
  Ionicons as IoniconsRaw,
} from "@expo/vector-icons";
import type { ComponentType } from "react";
import type { TextStyle, StyleProp } from "react-native";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export const Feather = FeatherRaw as unknown as ComponentType<IconProps>;
export const Ionicons = IoniconsRaw as unknown as ComponentType<IconProps>;
