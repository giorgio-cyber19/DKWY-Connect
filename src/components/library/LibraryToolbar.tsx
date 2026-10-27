"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, LayoutGrid, List, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { hasActiveFilters, DEFAULT_VIEW_STATE, type LibrarySortKey, type LibraryViewState, type ModifiedFilter, type SizeFilter } from "@/lib/library-view";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

export type LibraryLayout = "list" | "grid";

const MODIFIED_OPTIONS: { value: ModifiedFilter; label: TranslationKey }[] = [
  { value: "any", label: "library.anyTime" },
  { value: "today", label: "library.modToday" },
  { value: "7d", label: "library.modLast7" },
  { value: "30d", label: "library.modLast30" },
  { value: "thisYear", label: "library.modThisYear" },
  { value: "lastYear", label: "library.modLastYear" },
  { value: "custom", label: "library.modCustom" },
];

const SIZE_OPTIONS: { value: SizeFilter; label: TranslationKey }[] = [
  { value: "any", label: "library.anySize" },
  { value: "lt1", label: "library.sizeSmall" },
  { value: "1to10", label: "library.sizeMedium" },
  { value: "10to100", label: "library.sizeLarge" },
  { value: "gt100", label: "library.sizeHuge" },
];

const SORT_OPTIONS: { value: LibrarySortKey; label: TranslationKey }[] = [
  { value: "name", label: "library.sortName" },
  { value: "modified", label: "library.sortModified" },
  { value: "size", label: "library.sortSize" },
];

/** A Drive-style pill that opens a small menu underneath it. */
function Chip({
  label,
  active,
  onClear,
  children,
  align = "left",
}: {
  label: string;
  active: boolean;
  onClear?: () => void;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 pl-3 pr-2.5 rounded-full border text-[13px] font-medium transition-colors focus-ring whitespace-nowrap",
          active
            ? "bg-[color-mix(in_srgb,var(--color-blue)_14%,transparent)] border-[var(--color-blue)] text-[var(--color-blue-deep)]"
            : "border-[var(--border-soft)] hover:bg-black/[0.04]"
        )}
      >
        {label}
        {active && onClear ? (
          <span
            role="button"
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setOpen(false);
            }}
            className="rounded-full hover:bg-black/10 p-0.5"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={14} className="opacity-70" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full mt-1.5 z-30 min-w-[250px] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated-solid)] shadow-xl py-1.5",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-left hover:bg-black/[0.05]"
    >
      <span className="w-4 shrink-0">{selected && <Check size={14} className="text-[var(--color-blue-deep)]" />}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

export function LibraryToolbar({
  state,
  onChange,
  typeOptions,
  people,
  layout,
  onLayoutChange,
}: {
  state: LibraryViewState;
  onChange: (patch: Partial<LibraryViewState>) => void;
  typeOptions: { value: string; label: string }[];
  people: { id: string; name: string }[];
  layout: LibraryLayout;
  onLayoutChange: (layout: LibraryLayout) => void;
}) {
  const { t } = useLanguage();
  const tt = (key: TranslationKey) => t(key);

  const typeLabel = typeOptions.find((o) => o.value === state.type)?.label;
  const personLabel = people.find((p) => p.id === state.person)?.name;
  const modifiedLabel =
    state.modified === "custom"
      ? [state.from, state.to].filter(Boolean).join(" – ") || tt("library.modCustom")
      : tt(MODIFIED_OPTIONS.find((o) => o.value === state.modified)!.label);
  const sizeLabel = tt(SIZE_OPTIONS.find((o) => o.value === state.size)!.label);
  const sortLabel = tt(SORT_OPTIONS.find((o) => o.value === state.sortKey)!.label);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Chip label={state.type === "all" ? tt("library.filterType") : (typeLabel ?? tt("library.filterType"))} active={state.type !== "all"} onClear={() => onChange({ type: "all" })}>
        {(close) => (
          <>
            <Option selected={state.type === "all"} onClick={() => (onChange({ type: "all" }), close())}>
              {tt("library.anyType")}
            </Option>
            {typeOptions.map((o) => (
              <Option key={o.value} selected={state.type === o.value} onClick={() => (onChange({ type: o.value }), close())}>
                {o.label}
              </Option>
            ))}
          </>
        )}
      </Chip>

      {people.length > 1 && (
        <Chip label={state.person === "all" ? tt("library.filterPeople") : (personLabel ?? tt("library.filterPeople"))} active={state.person !== "all"} onClear={() => onChange({ person: "all" })}>
          {(close) => (
            <>
              <Option selected={state.person === "all"} onClick={() => (onChange({ person: "all" }), close())}>
                {tt("library.anyPerson")}
              </Option>
              {people.map((p) => (
                <Option key={p.id} selected={state.person === p.id} onClick={() => (onChange({ person: p.id }), close())}>
                  {p.name}
                </Option>
              ))}
            </>
          )}
        </Chip>
      )}

      <Chip label={state.modified === "any" ? tt("library.filterModified") : modifiedLabel} active={state.modified !== "any"} onClear={() => onChange({ modified: "any", from: "", to: "" })}>
        {(close) => (
          <>
            {MODIFIED_OPTIONS.map((o) => (
              <Option
                key={o.value}
                selected={state.modified === o.value}
                onClick={() => {
                  onChange({ modified: o.value, ...(o.value !== "custom" ? { from: "", to: "" } : {}) });
                  if (o.value !== "custom") close();
                }}
              >
                {tt(o.label)}
              </Option>
            ))}
            {state.modified === "custom" && (
              <div className="px-3.5 pt-2 pb-2.5 border-t border-[var(--border-soft)] mt-1.5 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {tt("library.rangeFrom")}
                  <input
                    type="date"
                    value={state.from}
                    max={state.to || undefined}
                    onChange={(e) => onChange({ from: e.target.value })}
                    className="mt-1 w-full text-[12.5px] px-2 py-1.5 rounded-lg border border-[var(--border-soft)] bg-transparent"
                  />
                </label>
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {tt("library.rangeTo")}
                  <input
                    type="date"
                    value={state.to}
                    min={state.from || undefined}
                    onChange={(e) => onChange({ to: e.target.value })}
                    className="mt-1 w-full text-[12.5px] px-2 py-1.5 rounded-lg border border-[var(--border-soft)] bg-transparent"
                  />
                </label>
              </div>
            )}
          </>
        )}
      </Chip>

      <Chip label={state.size === "any" ? tt("library.filterSize") : sizeLabel} active={state.size !== "any"} onClear={() => onChange({ size: "any" })}>
        {(close) =>
          SIZE_OPTIONS.map((o) => (
            <Option key={o.value} selected={state.size === o.value} onClick={() => (onChange({ size: o.value }), close())}>
              {tt(o.label)}
            </Option>
          ))
        }
      </Chip>

      {hasActiveFilters(state) && (
        <button
          type="button"
          onClick={() => onChange({ type: DEFAULT_VIEW_STATE.type, modified: "any", from: "", to: "", size: "any", person: "all" })}
          className="text-[13px] font-semibold text-[var(--color-blue-deep)] hover:underline px-1"
        >
          {tt("library.clearFilters")}
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Chip
          align="right"
          label={`${tt("library.sortLabel")}: ${sortLabel}`}
          active={false}
        >
          {(close) => (
            <>
              {SORT_OPTIONS.map((o) => (
                <Option key={o.value} selected={state.sortKey === o.value} onClick={() => (onChange({ sortKey: o.value }), close())}>
                  {tt(o.label)}
                </Option>
              ))}
              <div className="my-1.5 border-t border-[var(--border-soft)]" />
              <Option selected={state.sortDir === "asc"} onClick={() => (onChange({ sortDir: "asc" }), close())}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUp size={13} /> {tt("library.sortAsc")}
                </span>
              </Option>
              <Option selected={state.sortDir === "desc"} onClick={() => (onChange({ sortDir: "desc" }), close())}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowDown size={13} /> {tt("library.sortDesc")}
                </span>
              </Option>
            </>
          )}
        </Chip>

        <div className="inline-flex items-center rounded-full border border-[var(--border-soft)] overflow-hidden h-8" role="group">
          {(
            [
              ["list", List, "library.listView"],
              ["grid", LayoutGrid, "library.gridView"],
            ] as [LibraryLayout, typeof List, TranslationKey][]
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              title={tt(label)}
              aria-label={tt(label)}
              aria-pressed={layout === value}
              onClick={() => onLayoutChange(value)}
              className={cn(
                "w-9 h-full flex items-center justify-center transition-colors focus-ring",
                layout === value ? "bg-[color-mix(in_srgb,var(--color-blue)_16%,transparent)] text-[var(--color-blue-deep)]" : "text-[var(--text-secondary)] hover:bg-black/[0.05]"
              )}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
