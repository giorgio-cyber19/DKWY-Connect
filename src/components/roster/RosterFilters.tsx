"use client";

import { Search, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
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
      <input type="date" value={value.dateFrom} onChange={(e) => onChange({ dateFrom: e.target.value })} className={`${inputClass} w-auto`} title={t("roster.filterDateFrom")} />
      <input type="date" value={value.dateTo} onChange={(e) => onChange({ dateTo: e.target.value })} className={`${inputClass} w-auto`} title={t("roster.filterDateTo")} />
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
