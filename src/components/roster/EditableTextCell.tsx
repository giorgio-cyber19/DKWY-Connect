"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CellNavigation = "next" | "prev" | "down";

export function EditableTextCell({
  value,
  onCommit,
  onNavigate,
  isActive,
  onActivate,
  multiline,
  placeholder,
  className,
  readOnly,
}: {
  value: string;
  onCommit: (value: string) => void;
  /** Fired after a commit triggered by Tab, Shift+Tab, or Enter, so the parent grid can move focus. */
  onNavigate?: (direction: CellNavigation) => void;
  /** True when the parent grid's keyboard navigation has targeted this cell. */
  isActive?: boolean;
  /** Called on direct click so the parent grid's active-cell coordinate stays in sync. */
  onActivate?: () => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  /** Renders as plain static text, not clickable — for non-admin viewers. */
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && !editing && !readOnly) setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!editing) return;
    setDraft(value);
    const el = multiline ? textareaRef.current : inputRef.current;
    el?.focus();
    el?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function commit(direction?: CellNavigation) {
    setEditing(false);
    if (draft !== value) onCommit(draft);
    if (direction) onNavigate?.(direction);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      e.preventDefault();
      commit("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      commit(e.shiftKey ? "prev" : "next");
    }
  }

  const editClassName = cn(
    "w-full bg-transparent text-sm px-1.5 py-1 rounded-md border border-[var(--color-gold)] focus:outline-none",
    className
  );

  if (editing) {
    return multiline ? (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className={editClassName}
      />
    ) : (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={editClassName}
      />
    );
  }

  // A caller passing placeholder="" is explicitly opting out of any empty-cell hint —
  // show nothing rather than the usual "—", instead of the em dash always winning
  // because an empty string is falsy in the fallback chain below.
  const emptyFallback = placeholder === "" ? "" : "—";

  if (readOnly) {
    return (
      <p className={cn("text-sm px-1.5 py-1 truncate", !value && "text-[var(--text-secondary)]", className)}>
        {value || emptyFallback}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onActivate?.();
        setEditing(true);
      }}
      className={cn(
        "w-full text-left text-sm px-1.5 py-1 rounded-md border border-transparent hover:border-[var(--border-soft)] hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)] transition-colors truncate",
        !value && "text-[var(--text-secondary)]",
        className
      )}
    >
      {value || placeholder || emptyFallback}
    </button>
  );
}
