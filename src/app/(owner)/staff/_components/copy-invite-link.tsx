"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-xs">
        {url}
      </code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "복사됨!" : "복사"}
      </Button>
    </div>
  );
}
