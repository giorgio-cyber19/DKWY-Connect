"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/lib/language-context";
import type { User } from "@/lib/types";

export function UserMultiSelect({
  label,
  users,
  selectedIds,
  onChange,
  compact,
  readOnly,
}: {
  label: string;
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Hides the label and tightens spacing for use inside a table cell. */
  compact?: boolean;
  /** Shows chips only, no add/remove controls — for non-admin viewers. */
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setDraftIds(selectedIds);
      setQuery("");
    }
  }, [open, selectedIds]);

  const selectedUsers = selectedIds.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);

  // Pickable = active users, plus anyone already selected even if since disabled,
  // so editing an entry never silently drops a historical assignment.
  const pickable = useMemo(() => {
    const list = users.filter((u) => u.status === "active" || selectedIds.includes(u.id));
    const q = query.trim().toLowerCase();
    return q ? list.filter((u) => u.name.toLowerCase().includes(q)) : list;
  }, [users, selectedIds, query]);

  function toggle(id: string) {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function commit() {
    onChange(draftIds);
    setOpen(false);
  }

  return (
    <div>
      {!compact && <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</label>}
      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-1.5 min-h-[32px]"
            : "flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border-soft)] min-h-[46px]"
        }
      >
        {selectedUsers.length === 0 && <span className="text-sm text-[var(--text-secondary)] px-1">{t("roster.noOneSelected")}</span>}
        {selectedUsers.map((u) => (
          <span
            key={u.id}
            className="roster-chip inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] max-w-full"
          >
            <Avatar name={u.name} color={u.avatarColor} size="xs" />
            <span className="roster-chip-name text-xs font-medium min-w-0">{u.name}</span>
            {u.status === "disabled" && <Badge tone="danger">{t("roster.disabledTag")}</Badge>}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== u.id))}
                className="no-print text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label={t("common.remove")}
              >
                <X size={13} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="no-print"
            onClick={() => setOpen(true)}
            title={compact ? t("roster.addPeople") : undefined}
          >
            <UserPlus size={14} /> {!compact && t("roster.addPeople")}
          </Button>
        )}
      </div>

      <Modal open={open && !readOnly} onClose={() => setOpen(false)} title={label} size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("roster.searchPeoplePlaceholder")}
              autoFocus
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)] transition-colors"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
            {pickable.map((u) => {
              const checked = draftIds.includes(u.id);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)] transition-colors text-left"
                >
                  <input type="checkbox" readOnly checked={checked} className="accent-[var(--color-gold)]" />
                  <Avatar name={u.name} color={u.avatarColor} size="sm" />
                  <span className="min-w-0 flex-1 text-sm font-medium truncate">{u.name}</span>
                  <Badge tone={u.role === "admin" ? "gold" : "blue"}>{u.role === "admin" ? t("common.admin") : t("common.teacher")}</Badge>
                  {u.status === "disabled" && <Badge tone="danger">{t("roster.disabledTag")}</Badge>}
                </button>
              );
            })}
          </div>
          <Button className="w-full" onClick={commit}>
            {t("common.done")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
