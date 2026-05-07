// 로그인 화면 — PWA `(auth)/login` 디자인 매칭.
// PWA와 다른 점:
// - driver app만 쓰니 "셔틀이 기사" 식별성 유지 (PWA login은 "셔틀이")
// - 가입·비번찾기 링크는 외부 url로 (Linking.openURL)
// - 알림 alert는 translateError로 한글화

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { translateError } from "@shuttlee/shared-contracts/auth-errors";
import {
  isLikelyEmail,
  loginIdToEmail,
} from "@shuttlee/shared-contracts/login-id";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Ionicons } from "../components/Icon";
import { colors, radii } from "../lib/theme";
import { supabase } from "../lib/supabase";

const HELP_URL = "https://shuttle2-nine.vercel.app/forgot-password";

export function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    const id = identifier.trim();
    if (!id || !password) {
      setError("아이디와 비밀번호를 모두 입력해 주세요");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const email = isLikelyEmail(id) ? id : loginIdToEmail(id);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(translateError(authError));
      }
    } catch (e) {
      setError(translateError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="bus" size={20} color={colors.busForeground} />
          </View>
          <Text style={styles.brandText}>셔틀이 기사</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>
            학원장·원장이 발급한 로그인 아이디 또는 이메일을 입력하세요.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>이메일 또는 로그인 아이디</Text>
            <TextInput
              style={styles.input}
              placeholder="kim_driver 또는 driver@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              value={identifier}
              onChangeText={setIdentifier}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.submitWrap}>
            <Button
              size="lg"
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </View>

          <Pressable
            onPress={() => {
              void Linking.openURL(HELP_URL).catch(() => {});
            }}
            style={({ pressed }) => [
              styles.helpLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.helpText}>
              비밀번호를 잊으셨다면 학원장(원장)에게 초기화를 요청하세요.
            </Text>
          </Pressable>
        </Card>

        <Text style={styles.footer}>© 셔틀이 · 셔틀버스 운영 서비스</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bus,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  card: {
    padding: 24,
    gap: 16,
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "500",
    marginTop: -8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
  },
  input: {
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.foreground,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive + "60",
    backgroundColor: colors.destructive + "10",
    borderRadius: radii.md,
    padding: 10,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 12,
    fontWeight: "600",
  },
  submitWrap: {
    marginTop: 4,
  },
  helpLink: {
    paddingTop: 4,
  },
  helpText: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },
  footer: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 8,
  },
});
