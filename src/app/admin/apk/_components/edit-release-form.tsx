"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { editReleaseAction } from "../actions";

export function EditReleaseForm({
  id,
  version,
  defaultApkUrl,
  defaultReleaseNotes,
  defaultSha256,
  defaultFileSizeBytes,
}: {
  id: string;
  version: string;
  defaultApkUrl: string;
  defaultReleaseNotes: string | null;
  defaultSha256: string | null;
  defaultFileSizeBytes: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState(defaultApkUrl);
  const [releaseNotes, setReleaseNotes] = useState(defaultReleaseNotes ?? "");
  const [sha256, setSha256] = useState(defaultSha256 ?? "");
  const [fileSizeBytes, setFileSizeBytes] = useState(
    defaultFileSizeBytes != null ? String(defaultFileSizeBytes) : "",
  );

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setApkUrl(defaultApkUrl);
          setReleaseNotes(defaultReleaseNotes ?? "");
          setSha256(defaultSha256 ?? "");
          setFileSizeBytes(
            defaultFileSizeBytes != null ? String(defaultFileSizeBytes) : "",
          );
          setError(null);
          setOpen(true);
        }}
      >
        수정
      </Button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("apkUrl", apkUrl.trim());
        fd.set("releaseNotes", releaseNotes);
        fd.set("sha256", sha256.trim());
        fd.set("fileSizeBytes", fileSizeBytes.trim());
        const r = await editReleaseAction(fd);
        if (r.ok) {
          setOpen(false);
        } else {
          setError(r.error);
        }
      } catch (e) {
        console.error(e);
        setError("저장 실패");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 mt-2 w-full space-y-2 rounded-md border p-3"
    >
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {version} 수정
      </p>
      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          APK URL
        </label>
        <input
          type="text"
          value={apkUrl}
          onChange={(e) => setApkUrl(e.target.value)}
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="https://expo.dev/artifacts/eas/..."
        />
      </div>
      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          릴리스 노트 (선택)
        </label>
        <textarea
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={2}
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div>
          <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            SHA256 (선택)
          </label>
          <input
            type="text"
            value={sha256}
            onChange={(e) => setSha256(e.target.value)}
            placeholder="64자 16진수"
            className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            파일 크기 (선택, 바이트)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={fileSizeBytes}
            onChange={(e) => setFileSizeBytes(e.target.value)}
            placeholder="예: 41943040"
            className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
