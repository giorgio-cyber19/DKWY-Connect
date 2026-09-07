"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Trash2, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EditableTextCell } from "./EditableTextCell";
import { EditableDateCell } from "./EditableDateCell";
import { UserMultiSelect } from "./UserMultiSelect";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import type { RosterEntry, User } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">{label}</p>
      {children}
    </div>
  );
}

export function RosterMobileCards({ entries, users, isAdmin }: { entries: RosterEntry[]; users: User[]; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function commitField(entry: RosterEntry, patch: Partial<RosterEntry>) {
    await useAppStore.getState().updateRosterEntry(entry.id, patch);
  }

  async function duplicateRow(entry: RosterEntry) {
    const [y, m, d] = entry.date.split("-").map(Number);
    const shifted = new Date(y, m - 1, d + 7);
    const newDate = `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
    await useAppStore.getState().createRosterEntry({
      date: newDate,
      sundaySchoolUserIds: entry.sundaySchoolUserIds,
      teenClubUserIds: entry.teenClubUserIds,
      theme: entry.theme,
      notes: entry.notes,
      serviceType: entry.serviceType,
      preacher: entry.preacher,
      liturgy: entry.liturgy,
      musicalAccompaniment: entry.musicalAccompaniment,
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await useAppStore.getState().removeRosterEntry(deleteId);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id} className="p-4 space-y-3" hover={false}>
          <div className="flex items-center justify-between">
            <EditableDateCell value={entry.date} onCommit={(value) => commitField(entry, { date: value })} readOnly={!isAdmin} />
            <div className="flex items-center gap-1">
              <Link
                href={`/calendar?event=${entry.calendarEventId}`}
                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
                title={t("roster.viewInCalendar")}
              >
                <CalendarDays size={14} />
              </Link>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => duplicateRow(entry)}
                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
                    title={t("roster.duplicateEntry")}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(entry.id)}
                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10"
                    title={t("roster.deleteEntry")}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("roster.sundaySchool")}>
              <UserMultiSelect
                label={t("roster.sundaySchool")}
                users={users}
                selectedIds={entry.sundaySchoolUserIds}
                onChange={(ids) => commitField(entry, { sundaySchoolUserIds: ids })}
                compact
                readOnly={!isAdmin}
              />
            </Field>
            <Field label={t("roster.teenClub")}>
              <UserMultiSelect
                label={t("roster.teenClub")}
                users={users}
                selectedIds={entry.teenClubUserIds}
                onChange={(ids) => commitField(entry, { teenClubUserIds: ids })}
                compact
                readOnly={!isAdmin}
              />
            </Field>
          </div>

          <Field label={t("roster.theme")}>
            <EditableTextCell value={entry.theme} onCommit={(v) => commitField(entry, { theme: v })} placeholder={t("roster.themePlaceholder")} multiline readOnly={!isAdmin} />
          </Field>
          <Field label={t("roster.notes")}>
            <EditableTextCell value={entry.notes} onCommit={(v) => commitField(entry, { notes: v })} placeholder="" multiline readOnly={!isAdmin} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("roster.serviceType")}>
              <EditableTextCell value={entry.serviceType} onCommit={(v) => commitField(entry, { serviceType: v })} placeholder={t("roster.serviceTypePlaceholder")} readOnly={!isAdmin} />
            </Field>
            <Field label={t("roster.preacher")}>
              <EditableTextCell value={entry.preacher} onCommit={(v) => commitField(entry, { preacher: v })} placeholder={t("roster.preacherPlaceholder")} readOnly={!isAdmin} />
            </Field>
            <Field label={t("roster.liturgy")}>
              <EditableTextCell value={entry.liturgy} onCommit={(v) => commitField(entry, { liturgy: v })} placeholder={t("roster.liturgyPlaceholder")} readOnly={!isAdmin} />
            </Field>
            <Field label={t("roster.musicalAccompaniment")}>
              <EditableTextCell value={entry.musicalAccompaniment} onCommit={(v) => commitField(entry, { musicalAccompaniment: v })} placeholder={t("roster.musicalAccompanimentPlaceholder")} readOnly={!isAdmin} />
            </Field>
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title={t("roster.deleteConfirmTitle")}
        message={t("roster.deleteConfirmMessage")}
        confirmLabel={t("roster.deleteEntry")}
        confirming={deleting}
      />
    </div>
  );
}
