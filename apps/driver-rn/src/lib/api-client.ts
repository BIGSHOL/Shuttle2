// PWA 서버의 /api/driver/* Route Handler를 호출하는 fetch wrapper.
// Supabase access_token을 자동으로 Authorization: Bearer 헤더에 주입.
// middleware(`src/lib/supabase/middleware.ts`)가 Bearer를 검증해 x-auth-* 헤더에
// inject하므로 Route Handler는 cookie 케이스와 동일하게 처리.

import Constants from "expo-constants";

import { supabase } from "./supabase";

type Extras = {
  EXPO_PUBLIC_API_BASE_URL?: string;
};

const extras = (Constants.expoConfig?.extra ?? {}) as Extras;

const API_BASE_URL =
  extras.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://shuttlee.kr";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiInit = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T = unknown>(
  path: string,
  init?: ApiInit,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const body =
    init?.body !== undefined ? JSON.stringify(init.body) : undefined;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { error?: unknown };
      if (typeof json.error === "string") message = json.error;
    } catch {
      // body 없거나 JSON 아님
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
