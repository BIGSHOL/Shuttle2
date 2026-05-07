// Pressable wrapper — PWA의 shadcn Button equivalent.
// variants: primary(노란 bus), secondary(회색), ghost(투명), destructive(빨강).
// sizes: sm, md(기본), lg.

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radii } from "../lib/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  children: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  leadingIcon?: React.ReactNode;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
  leadingIcon,
}: Props) {
  const palette = PALETTE[variant];
  const sizing = SIZING[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === "ghost" ? 0 : StyleSheet.hairlineWidth,
          height: sizing.height,
          paddingHorizontal: sizing.padding,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {leadingIcon}
          <Text
            style={[
              styles.label,
              { color: palette.fg, fontSize: sizing.fontSize },
            ]}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const PALETTE: Record<
  ButtonVariant,
  { bg: string; fg: string; border: string }
> = {
  primary: {
    bg: colors.bus,
    fg: colors.busForeground,
    border: colors.bus,
  },
  secondary: {
    bg: colors.muted,
    fg: colors.foreground,
    border: colors.border,
  },
  ghost: {
    bg: "transparent",
    fg: colors.foreground,
    border: "transparent",
  },
  destructive: {
    bg: colors.destructive,
    fg: colors.destructiveForeground,
    border: colors.destructive,
  },
};

const SIZING: Record<
  ButtonSize,
  { height: number; padding: number; fontSize: number }
> = {
  sm: { height: 32, padding: 12, fontSize: 13 },
  md: { height: 44, padding: 16, fontSize: 15 },
  lg: { height: 48, padding: 20, fontSize: 16 },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.md,
  },
  label: {
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
