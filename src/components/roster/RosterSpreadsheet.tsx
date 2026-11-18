"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Trash2, CalendarDays, GripVertical } from "lucide-react";
import { EditableTextCell, type CellNavigation } from "./EditableTextCell";
import { EditableDateCell } from "./EditableDateCell";
import { UserMultiSelect } from "./UserMultiSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { cn, formatDate } from "@/lib/utils";
import type { RosterEntry, User } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n";

type TextField = "theme" | "notes" | "serviceType" | "preacher" | "liturgy" | "musicalAccompaniment";
const TEXT_FIELDS: TextField[] = ["theme", "notes", "serviceType", "preacher", "liturgy", "musicalAccompaniment"];

const PLACEHOLDER_KEYS = {
  theme: "roster.themePlaceholder",
  notes: "roster.notesPlaceholder",
  serviceType: "roster.serviceTypePlaceholder",
  preacher: "roster.preacherPlaceholder",
  liturgy: "roster.liturgyPlaceholder",
  musicalAccompaniment: "roster.musicalAccompanimentPlaceholder",
} as const satisfies Record<TextField, TranslationKey>;

/** What a Sunday holds besides its date: dragging a row moves these between Sundays, the dates stay in place. */
type Content = Pick<RosterEntry, "sundaySchoolUserIds" | "teenClubUserIds" | "theme" | "notes" | "serviceType" | "preacher" | "liturgy" | "musicalAccompaniment">;

function contentOf(entry: RosterEntry): Content {
  return {
    sundaySchoolUserIds: [...entry.sundaySchoolUserIds],
    teenClubUserIds: [...entry.teenClubUserIds],
    theme: entry.theme,
    notes: entry.notes,
    serviceType: entry.serviceType,
    preacher: entry.preacher,
    liturgy: entry.liturgy,
    musicalAccompaniment: entry.musicalAccompaniment,
  };
}

function sameContent(a: Content, b: Content): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface RosterMoveNotice {
  text: string;
  ok: boolean;
  /** Puts everything back the way it was. */
  undo?: () => Promise<void>;
}

const thClass = "sticky top-0 z-10 bg-[var(--bg-elevated)] text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] text-left px-2.5 py-2.5 border-b border-[var(--border-soft)] whitespace-nowrap";
const tdClass = "px-1.5 py-1 border-b border-[var(--border-softer)] align-top";

export function RosterSpreadsheet({
  entries,
  users,
  highlightId,
  focusRowId,
  isAdmin,
  canEdit,
  canReorder,
  onSaveStatusChange,
  onMoveNotice,
}: {
  entries: RosterEntry[];
  users: User[];
  highlightId?: string | null;
  /** Set (e.g. after "+ Add Row") to immediately put the Theme cell of that row into edit mode. */
  focusRowId?: string | null;
  /** Non-admins get a read-only grid — the API rejects their writes anyway. */
  isAdmin: boolean;
  /** Teachers and administrators may edit cells; only administrators add, duplicate or delete rows. */
  canEdit: boolean;
  /** Whether rows can be dragged to another Sunday (needs edit rights and an unfiltered view). */
  canReorder?: boolean;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved") => void;
  onMoveNotice?: (notice: RosterMoveNotice) => void;
}) {
  const { t, language } = useLanguage();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(null);
  const [activeCell, setActiveCell] = useState<{ entryId: string; field: TextField } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(highlightId ?? null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pendingSaves = useRef(0);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!focusRowId) return;
    setActiveCell({ entryId: focusRowId, field: "theme" });
    rowRefs.current[focusRowId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusRowId]);

  useEffect(() => {
    if (!highlightId) return;
    setFlashId(highlightId);
    rowRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setFlashId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  function beginSave() {
    pendingSaves.current += 1;
    onSaveStatusChange?.("saving");
  }
  function endSave() {
    pendingSaves.current = Math.max(0, pendingSaves.current - 1);
    if (pendingSaves.current === 0) onSaveStatusChange?.("saved");
  }

  async function commitField(entry: RosterEntry, patch: Partial<RosterEntry>) {
    beginSave();
    try {
      await useAppStore.getState().updateRosterEntry(entry.id, patch);
    } finally {
      endSave();
    }
  }

  /**
   * Drag-and-drop: the dragged Sunday's plan (teachers, theme, notes, service, preacher, liturgy, music) moves to the
   * Sunday it is dropped on; the Sundays in between shift one place. Dates never change, so calendar events stay put.
   */
  async function moveRow(fromId: string, targetId: string, after: boolean) {
    const from = entries.findIndex((e) => e.id === fromId);
    const hover = entries.findIndex((e) => e.id === targetId);
    if (from < 0 || hover < 0) return;
    const insertAt = hover + (after ? 1 : 0);
    const to = insertAt > from ? insertAt - 1 : insertAt;
    if (to === from) return;

    const before = entries.map(contentOf);
    const next = [...before];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const changes: { id: string; before: Content; after: Content }[] = [];
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      if (!sameContent(before[i], next[i])) changes.push({ id: entries[i].id, before: before[i], after: next[i] });
    }
    if (changes.length === 0) return;

    const apply = async (list: { id: string; content: Content }[]) => {
      for (const item of list) await useAppStore.getState().updateRosterEntry(item.id, item.content);
    };
    const short = (iso: string) => formatDate(iso, { day: "numeric", month: "short", year: undefined }, language);

    beginSave();
    const done: typeof changes = [];
    try {
      for (const change of changes) {
        await useAppStore.getState().updateRosterEntry(change.id, change.after);
        done.push(change);
      }
      onMoveNotice?.({
        ok: true,
        text: `${t("roster.rowMovedNotice")}: ${short(entries[from].date)} → ${short(entries[to].date)}`,
        undo: async () => {
          beginSave();
          try {
            await apply(changes.map((c) => ({ id: c.id, content: c.before })));
          } finally {
            endSave();
          }
        },
      });
    } catch {
      // Put back whatever was already moved so no Sunday ends up with someone else's plan.
      try {
        await apply(done.map((c) => ({ id: c.id, content: c.before })));
      } catch {
        /* the next sync shows the true state */
      }
      onMoveNotice?.({ ok: false, text: t("roster.moveRowFailed") });
    } finally {
      endSave();
    }
  }

  function moveActive(fromEntryId: string, field: TextField, direction: CellNavigation) {
    const rowIndex = entries.findIndex((e) => e.id === fromEntryId);
    const fieldIndex = TEXT_FIELDS.indexOf(field);

    if (direction === "down") {
      const nextRow = entries[rowIndex + 1];
      setActiveCell(nextRow ? { entryId: nextRow.id, field } : null);
      return;
    }
    if (direction === "next") {
      if (fieldIndex < TEXT_FIELDS.length - 1) {
        setActiveCell({ entryId: fromEntryId, field: TEXT_FIELDS[fieldIndex + 1] });
      } else {
        const nextRow = entries[rowIndex + 1];
        setActiveCell(nextRow ? { entryId: nextRow.id, field: TEXT_FIELDS[0] } : null);
      }
      return;
    }
    if (fieldIndex > 0) {
      setActiveCell({ entryId: fromEntryId, field: TEXT_FIELDS[fieldIndex - 1] });
    } else {
      const prevRow = entries[rowIndex - 1];
      setActiveCell(prevRow ? { entryId: prevRow.id, field: TEXT_FIELDS[TEXT_FIELDS.length - 1] } : null);
    }
  }

  async function duplicateRow(entry: RosterEntry) {
    beginSave();
    try {
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
    } finally {
      endSave();
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    beginSave();
    try {
      await useAppStore.getState().removeRosterEntry(deleteId);
    } finally {
      endSave();
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function textCell(entry: RosterEntry, field: TextField, rowBg: string, multiline?: boolean, widthClass?: string) {
    return (
      <td className={cn(tdClass, rowBg, widthClass)}>
        <EditableTextCell
          value={entry[field]}
          onCommit={(value) => commitField(entry, { [field]: value })}
          onNavigate={(dir) => moveActive(entry.id, field, dir)}
          isActive={canEdit && activeCell?.entryId === entry.id && activeCell.field === field}
          onActivate={() => setActiveCell({ entryId: entry.id, field })}
          multiline={multiline}
          placeholder={field === "notes" ? "" : t(PLACEHOLDER_KEYS[field])}
          readOnly={!canEdit}
        />
      </td>
    );
  }

  return (
    <div className="roster-scroll-area rounded-2xl border border-[var(--border-soft)] overflow-auto max-h-[70vh]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={cn(thClass, "sticky left-0 z-20 min-w-[110px]")}>{t("common.date")}</th>
            <th className={cn(thClass, "min-w-[170px]")}>{t("roster.sundaySchool")}</th>
            <th className={cn(thClass, "min-w-[170px]")}>{t("roster.teenClub")}</th>
            <th className={cn(thClass, "min-w-[220px]")}>{t("roster.theme")}</th>
            <th className={cn(thClass, "min-w-[220px]")}>{t("roster.notes")}</th>
            <th className={cn(thClass, "min-w-[150px]")}>{t("roster.serviceType")}</th>
            <th className={cn(thClass, "min-w-[150px]")}>{t("roster.preacher")}</th>
            <th className={cn(thClass, "min-w-[150px]")}>{t("roster.liturgy")}</th>
            <th className={cn(thClass, "min-w-[150px]")}>{t("roster.musicalAccompaniment")}</th>
            <th className={cn(thClass, "no-print min-w-[110px]")} />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const rowBg = flashId === entry.id ? "bg-[var(--color-gold-light)]" : "bg-[var(--bg-elevated)]";
            return (
            <tr
              key={entry.id}
              ref={(el) => {
                rowRefs.current[entry.id] = el;
              }}
              onDragOver={
                dragId
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const box = e.currentTarget.getBoundingClientRect();
                      const after = e.clientY > box.top + box.height / 2;
                      if (dropAt?.id !== entry.id || dropAt.after !== after) setDropAt({ id: entry.id, after });
                    }
                  : undefined
              }
              onDrop={
                dragId
                  ? (e) => {
                      e.preventDefault();
                      const target = dropAt?.id === entry.id ? dropAt : { id: entry.id, after: false };
                      const from = dragId;
                      setDragId(null);
                      setDropAt(null);
                      if (from) moveRow(from, entry.id, target.after);
                    }
                  : undefined
              }
              className={cn(
                dragId === entry.id && "opacity-40",
                dragId && dropAt?.id === entry.id && dragId !== entry.id && (dropAt.after ? "[&>td]:shadow-[inset_0_-3px_0_0_var(--color-blue)]" : "[&>td]:shadow-[inset_0_3px_0_0_var(--color-blue)]")
              )}
            >
              <td className={cn(tdClass, rowBg, "transition-colors duration-[1500ms] sticky left-0 z-[5]")}>
                <div className="flex items-center gap-1">
                  {canReorder && (
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", entry.id);
                        const row = rowRefs.current[entry.id];
                        if (row) e.dataTransfer.setDragImage(row, 12, 12);
                        setDragId(entry.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropAt(null);
                      }}
                      title={t("roster.dragRowHint")}
                      aria-label={t("roster.dragRowHint")}
                      className="no-print shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5"
                    >
                      <GripVertical size={15} />
                    </span>
                  )}
                  <EditableDateCell value={entry.date} onCommit={(value) => commitField(entry, { date: value })} readOnly={!canEdit} />
                </div>
              </td>
              <td className={cn(tdClass, rowBg, "transition-colors duration-[1500ms]")}>
                <UserMultiSelect
                  label={t("roster.sundaySchool")}
                  users={users}
                  selectedIds={entry.sundaySchoolUserIds}
                  onChange={(ids) => commitField(entry, { sundaySchoolUserIds: ids })}
                  compact
                  readOnly={!canEdit}
                />
              </td>
              <td className={cn(tdClass, rowBg, "transition-colors duration-[1500ms]")}>
                <UserMultiSelect
                  label={t("roster.teenClub")}
                  users={users}
                  selectedIds={entry.teenClubUserIds}
                  onChange={(ids) => commitField(entry, { teenClubUserIds: ids })}
                  compact
                  readOnly={!canEdit}
                />
              </td>
              {textCell(entry, "theme", cn(rowBg, "transition-colors duration-[1500ms]"), true)}
              {textCell(entry, "notes", cn(rowBg, "transition-colors duration-[1500ms]"), true)}
              {textCell(entry, "serviceType", cn(rowBg, "transition-colors duration-[1500ms]"))}
              {textCell(entry, "preacher", cn(rowBg, "transition-colors duration-[1500ms]"))}
              {textCell(entry, "liturgy", cn(rowBg, "transition-colors duration-[1500ms]"))}
              {textCell(entry, "musicalAccompaniment", cn(rowBg, "transition-colors duration-[1500ms]"))}
              <td className={cn(tdClass, rowBg, "transition-colors duration-[1500ms] no-print")}>
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
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

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
