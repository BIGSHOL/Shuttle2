"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { addReleaseAction } from "../actions";

export function AddReleaseForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [makeActive, setMakeActive] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("version", version);
        fd.set("apkUrl", apkUrl);
        fd.set("releaseNotes", releaseNotes);
        fd.set("makeActive", makeActive ? "1" : "0");
        const r = await addReleaseAction(fd);
        if (r.ok) {
          setVersion("");
          setApkUrl("");
          setReleaseNotes("");
          setMakeActive(true);
        } else {
          setError(r.error);
        }
      } catch (e) {
        console.error(e);
        setError("등록 실패");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-2">
        <Field
          label="version"
          placeholder="1.0.1"
          value={version}
          onChange={setVersion}
        />
        <Field
          label="APK URL"
          placeholder="https://expo.dev/artifacts/eas/..."
          value={apkUrl}
          onChange={setApkUrl}
        />
      </div>
      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          release notes (선택)
        </label>
        <textarea
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={3}
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="GPS 안정성 개선, FCM 토큰 자동 갱신 등"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeActive}
          onChange={(e) => setMakeActive(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-foreground font-medium">
          이 버전을 활성(active)으로 설정 (기존 활성 버전은 자동 비활성)
        </span>
      </label>
      {error ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중..." : "신 버전 등록"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
