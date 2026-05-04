"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createTrainingRecordAction,
  uploadTrainingCertificateAction,
  type CertificateUploadState,
  type TrainingFormState,
} from "../actions";

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];

type Mode = "none" | "url" | "file";

function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function plus2YearsKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCFullYear(kst.getUTCFullYear() + 2);
  return kst.toISOString().slice(0, 10);
}

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TrainingForm({
  staffs,
}: {
  staffs: { id: string; name: string; role: "OWNER" | "DRIVER" | "HELPER" }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    TrainingFormState,
    FormData
  >(createTrainingRecordAction, {});

  const [mode, setMode] = useState<Mode>("none");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<
    | { kind: "idle" }
    | { kind: "uploading" }
    | { kind: "ok" }
    | { kind: "error"; message: string; recordId: string }
  >({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1단계 성공 후 처리: file 모드는 업로드 호출, 그 외 즉시 redirect.
  useEffect(() => {
    if (!state.ok || !state.recordId) return;
    const recordId = state.recordId;
    if (mode === "file" && file) {
      void runUpload(recordId, file);
    } else {
      router.push("/training");
    }
    // ok 신호는 한 번만 처리 (state는 다음 submit까지 유지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.recordId]);

  async function runUpload(recordId: string, picked: File) {
    setUploadState({ kind: "uploading" });
    const fd = new FormData();
    fd.set("recordId", recordId);
    fd.set("file", picked);
    const res: CertificateUploadState = await uploadTrainingCertificateAction(
      {},
      fd,
    );
    if (res.ok) {
      setUploadState({ kind: "ok" });
      router.push("/training");
    } else {
      setUploadState({
        kind: "error",
        message: res.error ?? "업로드 실패",
        recordId,
      });
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileError(null);
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setFileError(`파일 크기는 5MB 이하여야 합니다 (현재 ${fmtFileSize(f.size)})`);
      return;
    }
    if (f.type && !ALLOWED_MIME.includes(f.type)) {
      setFileError("PDF·JPG·PNG만 업로드할 수 있어요");
      return;
    }
  }

  function retryUpload() {
    if (uploadState.kind !== "error" || !file) return;
    void runUpload(uploadState.recordId, file);
  }

  // file 모드인데 파일 안 골랐거나, 검증 에러 있으면 제출 막기
  const submitDisabled =
    pending ||
    uploadState.kind === "uploading" ||
    (mode === "file" && (!file || !!fileError));

  return (
    <Card>
      <CardHeader>
        <CardTitle>안전교육 기록 추가</CardTitle>
        <CardDescription>
          이수증을 받은 직원 기록을 추가합니다. 만료일은 보통 이수일 +
          2년이지만 강의 안내문에 적힌 날짜로 직접 입력하세요.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staffId">직원</Label>
            <select
              id="staffId"
              name="staffId"
              required
              defaultValue={staffs[0]?.id ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {staffs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({ROLE_LABEL[s.role]})
                </option>
              ))}
            </select>
            {state.fieldErrors?.staffId ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.staffId[0]}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">교육 구분</legend>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="category" value="OPERATOR" />
                운영자
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="category"
                  value="DRIVER"
                  defaultChecked
                />
                기사
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="category" value="HELPER" />
                동승보호자
              </label>
            </div>
            {state.fieldErrors?.category ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.category[0]}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="completedOn">이수일</Label>
            <Input
              id="completedOn"
              name="completedOn"
              type="date"
              defaultValue={todayKstDateString()}
              required
            />
            {state.fieldErrors?.completedOn ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.completedOn[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresOn">만료일 (다음 이수 기한)</Label>
            <Input
              id="expiresOn"
              name="expiresOn"
              type="date"
              defaultValue={plus2YearsKstDateString()}
              required
            />
            {state.fieldErrors?.expiresOn ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.expiresOn[0]}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">이수증 첨부</legend>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="_mode"
                  value="none"
                  checked={mode === "none"}
                  onChange={() => setMode("none")}
                />
                첨부 안 함
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="_mode"
                  value="file"
                  checked={mode === "file"}
                  onChange={() => setMode("file")}
                />
                파일 업로드 (PDF·JPG·PNG, 최대 5MB)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="_mode"
                  value="url"
                  checked={mode === "url"}
                  onChange={() => setMode("url")}
                />
                외부 URL 링크
              </label>
            </div>
          </fieldset>

          {mode === "file" ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={onFilePick}
                className="text-sm"
              />
              {file ? (
                <p className="text-muted-foreground text-xs">
                  선택됨: <span className="font-medium">{file.name}</span> ·{" "}
                  {fmtFileSize(file.size)}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  PDF / JPG / PNG · 최대 5MB
                </p>
              )}
              {fileError ? (
                <p className="text-destructive text-xs">{fileError}</p>
              ) : null}
            </div>
          ) : null}

          {mode === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="certificateUrl">이수증 외부 URL</Label>
              <Input
                id="certificateUrl"
                name="certificateUrl"
                type="url"
                placeholder="https://..."
              />
              {state.fieldErrors?.certificateUrl ? (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.certificateUrl[0]}
                </p>
              ) : null}
            </div>
          ) : (
            // mode가 url이 아니면 빈 hidden input으로 서버 검증 통과
            <input type="hidden" name="certificateUrl" value="" />
          )}

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}

          {uploadState.kind === "uploading" ? (
            <p className="text-muted-foreground text-sm">
              이수증 파일 업로드 중...
            </p>
          ) : null}
          {uploadState.kind === "error" ? (
            <div
              className="border-warning/30 bg-warning-soft/40 text-foreground/90 space-y-2 rounded-md border p-3 text-sm"
              role="alert"
            >
              <p className="font-medium">
                기록은 저장됐지만 파일 업로드에 실패했어요.
              </p>
              <p className="text-muted-foreground text-xs">
                {uploadState.message}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={retryUpload}
                >
                  다시 시도
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push("/training")}
                >
                  목록으로 (파일 없이)
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/training">취소</Link>
          </Button>
          <Button type="submit" disabled={submitDisabled}>
            {pending
              ? "추가 중..."
              : uploadState.kind === "uploading"
                ? "업로드 중..."
                : "추가"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
