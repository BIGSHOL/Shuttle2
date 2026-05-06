// 로그인 화면.
// PWA 로그인 폼과 동일한 패턴: 입력 1개로 (이메일 또는 loginId) + 비밀번호.
// `@` 포함이면 이메일, 아니면 loginId → loginIdToEmail()로 placeholder 이메일 변환.

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  isLikelyEmail,
  loginIdToEmail,
} from "@shuttlee/shared-contracts/login-id";

import { supabase } from "../lib/supabase";

export function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    const id = identifier.trim();
    if (!id || !password) {
      Alert.alert("입력 필요", "아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const email = isLikelyEmail(id) ? id : loginIdToEmail(id);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        Alert.alert("로그인 실패", error.message);
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.safe,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>셔틀이 기사</Text>
          <Text style={styles.subtitle}>
            로그인 아이디 또는 이메일로 로그인하세요
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="아이디 또는 이메일"
          autoCapitalize="none"
          autoCorrect={false}
          value={identifier}
          onChangeText={setIdentifier}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && !loading && styles.buttonPressed,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </Pressable>

        <Text style={styles.help}>
          비밀번호를 잊으셨다면 학원장(원장)에게 초기화를 요청하세요.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    height: 48,
    backgroundColor: "#facc15",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
  help: {
    marginTop: 24,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
});
