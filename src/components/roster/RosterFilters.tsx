"use client";

import { Search, X, CalendarRange } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { addDays, todayInAmsterdam } from "@/lib/attendance-stats";
import { formatDate } from "@/lib/utils";
import type { User } from "@/lib/types";

export interface RosterFilterState {
  dateFrom: string;
  dateTo: string;
  userId: string;
  search: string;
}

export const emptyRosterFilters: RosterFilterState = {
  dateFrom: "",
  dateTo: "",
  userId: "",
  search: "",
};

const inputClass =
  "w-full text-sm px-3 py-2 rounded-xl border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] transition-colors";

function hasActiveFilters(v: RosterFilterState) {
  return Object.values(v).some((x) => x !== "");
}

function lastDayOfMonth(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
}

/** Ready-made periods, so the usual cases take one click instead of typing two dates. */
function quickPeriods(today: string) {
  const [y, m] = today.split("-").map(Number);
  return [
    { key: "periodThisMonth" as const, from: `${y}-${String(m).padStart(2, "0")}-01`, to: lastDayOfMonth(y, m - 1) },
    { key: "periodNext3Months" as const, from: today, to: addDays(today, 90) },
    { key: "periodThisYear" as const, from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

/** "Period": a clearly labelled From → To range with shortcuts and a plain-language summary of what is selected. */
function PeriodFilter({ value, onChange }: { value: RosterFilterState; onChange: (patch: Partial<RosterFilterState>) => void }) {
  const { t, language } = useLanguage();
  const today = todayInAmsterdam();
  const active = !!(value.dateFrom || value.dateTo);

  const fmt = (iso: string) => formatDate(iso, undefined, language);
  const summary = [
    value.dateFrom && `${t("roster.filterDateFrom")} ${fmt(value.dateFrom)}`,
    value.dateTo && `${value.dateFrom ? t("roster.filterDateTo").toLowerCase() : t("roster.filterDateTo")} ${fmt(value.dateTo)}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full rounded-2xl border border-[var(--border-soft)] p-3 sm:p-3.5">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] sm:self-center mr-1 w-full sm:w-auto">
          <CalendarRange size={14} /> {t("roster.filterPeriod")}
        </p>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-end sm:gap-3">
        <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {t("roster.filterDateFrom")}
          <input
            type="date"
            value={value.dateFrom}
            max={value.dateTo || undefined}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className={`${inputClass} w-full sm:w-auto mt-1 block`}
          />
        </label>
        <span aria-hidden className="hidden sm:block pb-2.5 text-[var(--text-secondary)]">→</span>
        <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {t("roster.filterDateTo")}
          <input
            type="date"
            value={value.dateTo}
            min={value.dateFrom || undefined}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className={`${inputClass} w-full sm:w-auto mt-1 block`}
          />
        </label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {quickPeriods(today).map((p) => {
            const selected = value.dateFrom === p.from && value.dateTo === p.to;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onChange({ dateFrom: p.from, dateTo: p.to })}
                aria-pressed={selected}
                className={`h-8 px-3 rounded-full border text-[12px] font-medium transition-colors focus-ring ${
                  selected
                    ? "bg-[color-mix(in_srgb,var(--color-blue)_14%,transparent)] border-[var(--color-blue)] text-[var(--color-blue-deep)]"
                    : "border-[var(--border-soft)] hover:bg-black/[0.04]"
                }`}
              >
                {t(`roster.${p.key}`)}
              </button>
            );
          })}
          {active && (
            <button
              type="button"
              onClick={() => onChange({ dateFrom: "", dateTo: "" })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1.5 h-8"
            >
              <X size={13} /> {t("roster.periodClear")}
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] mt-2 text-[var(--text-secondary)]">
        {active ? <span className="font-semibold text-[var(--text-primary)]">{summary}</span> : t("roster.periodHint")}
      </p>
    </div>
  );
}

export function RosterFilters({
  value,
  onChange,
  users,
}: {
  value: RosterFilterState;
  onChange: (patch: Partial<RosterFilterState>) => void;
  users: User[];
}) {
  const { t } = useLanguage();

  return (
    <div className="no-print flex flex-wrap items-end gap-2.5 mb-4">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={t("roster.searchPlaceholder")}
          className={`${inputClass} pl-9`}
        />
      </div>
      <select value={value.userId} onChange={(e) => onChange({ userId: e.target.value })} className={`${inputClass} w-auto min-w-[160px]`}>
        <option value="">{t("roster.filterUser")}</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <PeriodFilter value={value} onChange={onChange} />
      {hasActiveFilters(value) && (
        <button
          type="button"
          onClick={() => onChange(emptyRosterFilters)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-2"
        >
          <X size={13} /> {t("roster.clearFilters")}
        </button>
      )}
    </div>
  );
}
