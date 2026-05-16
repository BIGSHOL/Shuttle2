"use client";

// W26-C: 가벼운 검색 가능 Select.
// Radix Select는 30+ 항목 스크롤이 운영 병목이라 신규 작성.
// form submit 호환 — hidden input에 선택값 보관, 사용자 검색은 별도 query 상태.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
};

export function SearchableSelect({
  name,
  id,
  options,
  defaultValue,
  placeholder = "선택",
  searchPlaceholder = "검색...",
  emptyLabel = "결과 없음",
  required,
  disabled,
  className,
}: {
  name: string;
  id?: string;
  options: SearchableOption[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === selected);
  const filtered = query.trim()
    ? options.filter((o) =>
        (o.label + (o.description ?? ""))
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(opt: SearchableOption) {
    setSelected(opt.value);
    setOpen(false);
    setQuery("");
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) pick(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <input
        type="hidden"
        name={name}
        value={selected}
        required={required}
        readOnly
      />
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="border-input bg-background hover:bg-accent flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`truncate text-left ${
            selectedOption ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
      </button>

      {open ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
          <div className="border-b p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-3 py-2 text-xs">
                {emptyLabel}
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  className={`hover:bg-accent flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                    i === activeIdx ? "bg-accent" : ""
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
                  // onMouseDown으로 받아야 popover 외부 click handler가 먼저
                  // 발동되어 닫히기 전에 선택이 처리됨.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{opt.label}</div>
                    {opt.description ? (
                      <div className="text-muted-foreground truncate text-xs font-normal">
                        {opt.description}
                      </div>
                    ) : null}
                  </div>
                  {opt.value === selected ? (
                    <Check className="text-primary h-4 w-4 shrink-0" />
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
