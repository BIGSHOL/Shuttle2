"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { sendTestPushAction } from "../actions";

export function PushTestForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "destructive";
    text: string;
  } | null>(null);
  const [kind, setKind] = useState<"STAFF" | "GUARDIAN">("STAFF");
  const [id, setId] = useState("");
  const [title, setTitle] = useState("셔틀이 매니저 — 푸시 테스트");
  const [body, setBody] = useState(
    "이 알림이 보이면 푸시 등록이 정상 동작합니다.",
  );
  const [url, setUrl] = useState("/home");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("kind", kind);
        fd.set("id", id);
        fd.set("title", title);
        fd.set("body", body);
        fd.set("url", url);
        const r = await sendTestPushAction(fd);
        if (r.ok) {
          setFeedback({
            tone: "success",
            text: `발송 완료: ${r.sent}건${r.pruned > 0 ? ` (만료된 구독 ${r.pruned}건 정리)` : ""}`,
          });
        } else {
          setFeedback({ tone: "destructive", text: r.error });
        }
      } catch (e) {
        console.error(e);
        setFeedback({ tone: "destructive", text: "발송 실패" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-2">
        <div>
          <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            대상 종류
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "STAFF" | "GUARDIAN")}
            className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm"
          >
            <option value="STAFF">Staff (학원장·기사·동승자)</option>
            <option value="GUARDIAN">학부모 (Guardian)</option>
          </select>
        </div>
        <div>
          <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            대상 ID
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="staffId 또는 guardianId (cuid)"
            className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm"
          />
          <p className="text-muted-foreground mt-1 text-[10px]">
            /admin/users에서 검색 후 디테일 url의 마지막 segment.
          </p>
        </div>
      </div>

      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          본문
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div>
        <label className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          클릭 시 이동 URL (선택)
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/home"
          className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm"
        />
      </div>

      {feedback ? (
        <p
          className={`text-xs font-medium ${
            feedback.tone === "success" ? "text-success" : "text-destructive"
          }`}
          role="alert"
        >
          {feedback.text}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending || !id}>
          {pending ? "발송 중..." : "테스트 발송"}
        </Button>
      </div>
    </form>
  );
}
