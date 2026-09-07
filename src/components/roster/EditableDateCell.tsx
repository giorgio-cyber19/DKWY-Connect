"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export function EditableDateCell({
  value,
  onCommit,
  readOnly,
}: {
  value: string;
  onCommit: (value: string) => void;
  readOnly?: boolean;
}) {
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    ref.current?.focus();
    try {
      ref.current?.showPicker?.();
    } catch {
      // showPicker() throws if not called from a user gesture in some browsers — the
      // native input is already focused, so the user can still open it manually.
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        type="date"
        defaultValue={value}
        onChange={(e) => {
          if (e.target.value) onCommit(e.target.value);
        }}
        onBlur={() => setEditing(false)}
        className="w-full bg-transparent text-sm px-1.5 py-1 rounded-md border border-[var(--color-gold)] focus:outline-none"
      />
    );
  }

  if (readOnly) {
    return <p className="text-sm font-medium px-1.5 py-1 whitespace-nowrap">{formatDate(value, { weekday: "short" }, language)}</p>;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm font-medium px-1.5 py-1 rounded-md border border-transparent hover:border-[var(--border-soft)] hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)] transition-colors whitespace-nowrap"
    >
      {formatDate(value, { weekday: "short" }, language)}
    </button>
  );
}
